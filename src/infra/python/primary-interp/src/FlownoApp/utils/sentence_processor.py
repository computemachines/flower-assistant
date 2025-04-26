from collections import OrderedDict
from dataclasses import dataclass
import logging
from string import whitespace
import token
import spacy
from typing import Any, List, Generator, final, NamedTuple

from spacy.tokens import Doc, Span

from FlownoApp.messages.ipc_schema import ChunkedResponse
from .debug_utils import debug_args_retval

logger = logging.getLogger(__name__)

# Load spaCy model once when the module is loaded
nlp = spacy.load("en_core_web_sm")
nlp.add_pipe("sentencizer")

@dataclass
class TokenSource:
    """
    All the information required to reconstruct a text.
    """
    text: str # Token.text_
    whitespace: str # Token.whitespace_
    chunk_ids: list[str] # List of chunk IDs that contributed to this token

    def __str__(self) -> str:
        """
        Returns a shorthand string representation of the token source.
        """
        return f"""'{self.text}{self.whitespace}'_[{", ".join(self.chunk_ids)}]"""

@final
class TokenSourceBuffer:
    def __init__(self, token_sources: list[TokenSource]):
        self.token_sources: list[TokenSource] = token_sources
    
    def __repr__(self) -> str:
        """
        Returns a string representation of the buffer.
        """
        if not self.token_sources:
            return "TokenSourceBuffer()"
        return f"TokenSourceBuffer(\n    {'\n    '.join(map(str, self.token_sources))}\n)"
        
    @property
    def spaces(self) -> list[bool]:
        """
        Returns a list of boolean values indicating whether each token is followed by a space.
        This is used for compatibility with spaCy's Doc constructor which expects a boolean list.
        """
        return [token.whitespace == " " for token in self.token_sources]

    def to_text(self) -> str:
        """
        Reconstructs the text from the token sources.
        """
        return "".join([token.text + token.whitespace for token in self.token_sources])
    
    def to_doc(self) -> Doc:
        """
        Reconstructs the text from the token sources and processes it with spaCy.
        """
        tokens = [token.text for token in self.token_sources]
        spaces = self.spaces
        
        # Create the doc with our tokens and spaces
        doc = Doc(nlp.vocab, words=tokens, spaces=spaces)
        
        # Process the doc with the pipeline to ensure sentence boundaries are set
        processed_doc = nlp.pipe([doc]).__next__()
        
        return processed_doc

    def _merge_existing_token(
        self,
        new_doc: Doc,
        old_count: int,
        chunk_id: str,
        ignore_whitespace_only: bool,
    ):
        """
        Updates the last existing TokenSource when re-tokenization changes it.
        """
        if old_count == 0:
            return
        idx = old_count - 1
        token_source = self.token_sources[idx]
        new_token = new_doc[idx]
        text_changed = token_source.text != new_token.text
        ws_changed = token_source.whitespace != new_token.whitespace_

        if text_changed:
            token_source.text = new_token.text
            if chunk_id not in token_source.chunk_ids:
                token_source.chunk_ids.append(chunk_id)
        if ws_changed and not (ignore_whitespace_only and not text_changed):
            token_source.whitespace = new_token.whitespace_
            if chunk_id not in token_source.chunk_ids:
                token_source.chunk_ids.append(chunk_id)

    def _append_new_tokens(
        self,
        new_doc: Doc,
        start_idx: int,
        chunk_id: str,
    ):
        """
        Appends any new tokens from new_doc[start_idx:] to token_sources.
        """
        for token in new_doc[start_idx:]:
            self.token_sources.append(
                TokenSource(
                    text=token.text,
                    whitespace=token.whitespace_,
                    chunk_ids=[chunk_id]
                )
            )


    def add_chunk(
        self,
        chunk: ChunkedResponse,
        ignore_whitespace_only: bool = False,
    ):
        """
        Adds a new chunk of text to the buffer by re-tokenizing the
        combined text and updating the internal token sources.
        """
        chunk_text = chunk.content
        # If the chunk content is empty, there's nothing to process
        if not chunk_text:
            # Still need to record the chunk ID if it's the final one,
            # SentenceProcessor handles this.
            return

        # Combine existing text and new chunk
        combined_text = self.to_text() + chunk_text
        # Complete retokenization of combined text
        new_doc = nlp(combined_text)
        # Identify the first index where tokens diverge
        start_idx = self._find_first_discrepancy(new_doc)
        # Merge and append tokens only from the changed region
        self._merge_and_append(new_doc, start_idx, chunk.id, ignore_whitespace_only)

    def _find_first_discrepancy(self, new_doc: Doc) -> int:
        """
        Scan new_doc against existing token_sources and return the first index
        where text or whitespace differs. If none differ, return the min length.
        """
        old_len = len(self.token_sources)
        new_len = len(new_doc)
        limit = min(old_len, new_len)
        for i in range(limit):
            ts = self.token_sources[i]
            nt = new_doc[i]
            if ts.text != nt.text or ts.whitespace != nt.whitespace_:
                return i
        return limit

    def _merge_and_append(
        self,
        new_doc: Doc,
        start_idx: int,
        chunk_id: str,
        ignore_whitespace_only: bool = False,
    ):
        """
        Merge updates to existing tokens starting at start_idx and append any new tokens
        from new_doc beyond the current buffer length.
        """
        # TODO: Prove that sentence boundaries cannot appear between misordered chunk ids
        #       caused by retokenization affecting earlier tokens. If a sentence boundary
        #       *can* appear mid-reordering, the chunk_id attribution for sentences
        #       might become incorrect.
        old_count = len(self.token_sources)
        # Merge any changed existing tokens
        for idx in range(start_idx, old_count):
            self._merge_existing_token(new_doc, idx + 1, chunk_id, ignore_whitespace_only)
        # Append new tokens beyond the old count
        if len(new_doc) > old_count:
            self._append_new_tokens(new_doc, old_count, chunk_id)

    def pop_prefix_span(self, span: Span) -> list[TokenSource]:
        """
        Takes a prefix span from the buffer and returns the corresponding token sources.
        """
        start = span.start
        end = span.end

        # Get the token sources for the specified span
        token_sources = self.token_sources[start:end]

        self.token_sources = self.token_sources[:start] + self.token_sources[end:]
        return token_sources

# Define the NamedTuple for the return type
SentenceResult = NamedTuple('SentenceResult', [('chunk_ids', list[str]), ('text', str)])

class SentenceProcessor:
    """
    Processes text chunks to detect and yield complete sentences using spaCy.
    Uses TokenSourceBuffer to track which chunks contributed to each token.
    
    When enough complete sentences are detected, returns the chunk IDs for the first sentence.
    """
    def __init__(self):
        self.buffer = TokenSourceBuffer(token_sources=[])

    def __repr__(self) -> str:
        """
        Returns a string representation of the SentenceProcessor.
        """
        return f"SentenceProcessor(\n    {self.buffer}\n)"
    
    # @debug_args_retval
    def process_chunk(
        self,
        chunk: ChunkedResponse | None = None,
        stream_finished: bool = False,
        ignore_whitespace_only: bool = False,
        num_buffer_sentences: int = 1,
    ) -> SentenceResult:
        """
        Processes chunks of text and returns chunk IDs and text for detected
        complete sentences.
        
        Args:
            chunk: New chunk to add to the buffer (can be None)
            stream_finished: Flag indicating if the stream is finished
            ignore_whitespace_only: Flag indicating if whitespace-only updates should be ignored
            
        Returns:
            SentenceResult: A named tuple containing:
                - chunk_ids (list[str]): List of chunk IDs contributing to the detected sentence(s).
                - text (str): The reconstructed text of the detected sentence(s).
              Returns SentenceResult([], "") if no complete sentence is available yet.
        """
        # Add the chunk to our buffer if not None
        if chunk is not None:
            # pass through whitespace-flag to buffer
            self.buffer.add_chunk(chunk, ignore_whitespace_only=ignore_whitespace_only)
        
        # If buffer is empty, return empty result
        if not self.buffer.token_sources:
            return SentenceResult([], "")
        
        # Create a spaCy Doc from our buffer
        doc = self.buffer.to_doc()
        # Extract sentences from the processed doc
        sentences = list(doc.sents)

        if stream_finished:
            # return all chunk IDs and text in the buffer, deduped in insertion order
            current_ids = list(dict.fromkeys(
                cid for ts in self.buffer.token_sources for cid in ts.chunk_ids
            ))
            all_text = self.buffer.to_text()

            # If stream_finished was triggered by a specific chunk (even an empty one),
            # ensure its ID is included in the final list.
            final_chunk_id = chunk.id if chunk and chunk.finish_reason is not None else None

            if final_chunk_id and final_chunk_id not in current_ids:
                 # Append the final chunk ID if it's not already present
                 all_chunk_ids = current_ids + [final_chunk_id]
                 # No need for dict.fromkeys again, as final_chunk_id wasn't in current_ids
            else:
                 all_chunk_ids = current_ids

            # Clear buffer after processing final content
            self.buffer.token_sources = []
            return SentenceResult(all_chunk_ids, all_text)

        # Collect raw chunk IDs in processing order
        raw_ids: list[str] = []
        processed_text = ""
        tokens_to_pop_count = 0
        complete_sentences = sentences[:-num_buffer_sentences]  # All sentences except the last num_buffer_sentences
        
        # Iterate through complete sentences to collect data *without* popping yet
        for sentence in complete_sentences:
            sentence_start = sentence.start
            sentence_end = sentence.end
            
            # Ensure we don't process beyond the current buffer length (can happen with complex edits)
            if sentence_end > len(self.buffer.token_sources):
                 sentence_end = len(self.buffer.token_sources)
                 if sentence_start >= sentence_end:
                     continue # Skip if start is already past the end

            # Collect unique chunk IDs and text from this sentence's tokens in the *current* buffer
            for i in range(sentence_start, sentence_end):
                 token_source = self.buffer.token_sources[i]
                 processed_text += token_source.text + token_source.whitespace
                 # accumulate IDs; dedupe will happen later
                 raw_ids.extend(token_source.chunk_ids)
            
            # Track how many tokens belong to the processed sentences
            tokens_to_pop_count = sentence_end 

        # Now, pop the processed tokens from the buffer *after* the loop
        if tokens_to_pop_count > 0:
            # Create a dummy span representing the tokens to pop
            # We only need start/end indices for pop_prefix_span
            pop_span = Span(doc, 0, tokens_to_pop_count) 
            self.buffer.pop_prefix_span(pop_span)
        
        # Dedupe chunk IDs while preserving insertion order
        processed_chunk_ids = list(dict.fromkeys(raw_ids))
        return SentenceResult(processed_chunk_ids, processed_text)