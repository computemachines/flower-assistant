"""
Sentence boundary detection using spaCy.
"""
import logging
from flowno import Stream, node

from FlownoApp.messages.ipc_schema import ChunkedResponse, SentenceEvent, SentenceEventPayload
from FlownoApp.utils.sentence_processor import SentenceProcessor
from FlownoApp.nodes.inference import new_id

logger = logging.getLogger(__name__)


@node(stream_in=["chunks"])
async def ChunkSentences(chunks: Stream[ChunkedResponse]):
    """
    Read a stream of text chunks and split them into sentences using spaCy.
    
    Args:
        chunks: The input text chunks to be segmented into sentences
        
    Yields:
        SentenceEvent: Event with sentence payload for TTS processing
    """
    sentencizer = SentenceProcessor()
    num_buffer_sentences = 1
    # Counter for preserving sentence order
    sentence_order = 0
    
    async for chunk in chunks:
        chunk_ids, sentence_text = sentencizer.process_chunk(
            chunk, 
            stream_finished=chunk.finish_reason is not None, 
            num_buffer_sentences=num_buffer_sentences
        )
        
        # If we found a complete sentence, create and yield a SentenceEvent
        if sentence_text:
            # Create a sentence ID
            sentence_id = new_id("sentence")
            
            # Create the payload with sentence info
            payload = SentenceEventPayload(
                id=sentence_id,
                chunk_ids=chunk_ids,
                text=sentence_text.strip(),
                audio="",  # Empty for now, could be filled with pre-rendered audio
                order=sentence_order
            )
            
            # Create the event
            sentence_event = SentenceEvent(type="sentence", payload=payload)
            
            # Increment the order counter for the next sentence
            sentence_order += 1
            
            # Start keeping two sentences in buffer after first sentence is detected
            num_buffer_sentences = 2
            
            # Yield the sentence event
            yield sentence_event
