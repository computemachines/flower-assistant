import pytest
from unittest.mock import MagicMock, patch
import sys

# Mock the nodejs bridge modules before importing any FlownoApp modules
sys.modules['_nodejs_callback_bridge'] = MagicMock()
sys.modules['nodejs_callback_bridge'] = MagicMock()

# Now we can safely import from FlownoApp
from FlownoApp.utils.sentence_processor import TokenSource, TokenSourceBuffer, SentenceProcessor, nlp, SentenceResult
from FlownoApp.messages.ipc_schema import ChunkedResponse
from spacy.tokens import Doc, Span


class TestTokenSource:
    def test_token_source_creation(self):
        """Test the creation of a TokenSource object with basic properties."""
        token = TokenSource(text="hello", whitespace=" ", chunk_ids=["chunk1"])
        
        assert token.text == "hello"
        assert token.whitespace == " "
        assert token.chunk_ids == ["chunk1"]
    
    def test_token_source_with_multiple_chunk_ids(self):
        """Test the creation of a TokenSource with multiple chunk IDs."""
        token = TokenSource(text="world", whitespace="", chunk_ids=["chunk1", "chunk2"])
        
        assert token.text == "world"
        assert token.whitespace == ""
        assert token.chunk_ids == ["chunk1", "chunk2"]
        assert len(token.chunk_ids) == 2


class TestTokenSourceBuffer:
    def test_token_source_buffer_creation(self):
        """Test the creation of a TokenSourceBuffer object with token sources."""
        tokens = [
            TokenSource(text="Hello", whitespace=" ", chunk_ids=["chunk1"]),
            TokenSource(text="world", whitespace="", chunk_ids=["chunk1"]),
            TokenSource(text="!", whitespace=" ", chunk_ids=["chunk2"])
        ]
        
        buffer = TokenSourceBuffer(token_sources=tokens)
        assert len(buffer.token_sources) == 3
        assert buffer.token_sources[0].text == "Hello"
        assert buffer.token_sources[1].text == "world"
        assert buffer.token_sources[2].text == "!"
    
    def test_spaces_property(self):
        """Test the spaces property that computes boolean values from whitespace strings."""
        tokens = [
            TokenSource(text="Hello", whitespace=" ", chunk_ids=["chunk1"]),
            TokenSource(text="world", whitespace="", chunk_ids=["chunk1"]),
            TokenSource(text="!", whitespace=" ", chunk_ids=["chunk2"])
        ]
        
        buffer = TokenSourceBuffer(token_sources=tokens)
        spaces = buffer.spaces
        
        assert spaces == [True, False, True]
    
    def test_to_text_conversion(self):
        """Test the conversion of TokenSourceBuffer to text."""
        tokens = [
            TokenSource(text="Hello", whitespace=" ", chunk_ids=["chunk1"]),
            TokenSource(text="world", whitespace="", chunk_ids=["chunk1"]),
            TokenSource(text="!", whitespace=" ", chunk_ids=["chunk2"])
        ]
        
        buffer = TokenSourceBuffer(token_sources=tokens)
        text = buffer.to_text()
        
        assert text == "Hello world! "
    
    def test_to_doc_conversion(self):
        """Test the conversion of TokenSourceBuffer to a spaCy Doc object."""
        tokens = [
            TokenSource(text="Hello", whitespace=" ", chunk_ids=["chunk1"]),
            TokenSource(text="world", whitespace="", chunk_ids=["chunk1"]),
            TokenSource(text="!", whitespace=" ", chunk_ids=["chunk2"])
        ]
        
        buffer = TokenSourceBuffer(token_sources=tokens)
        doc = buffer.to_doc()
        
        # Verify it's a spaCy Doc object
        from spacy.tokens import Doc
        assert isinstance(doc, Doc)
        
        # Check the tokens and spaces are correct
        assert len(doc) == 3
        assert [token.text for token in doc] == ["Hello", "world", "!"]
        
        # Check spaces match our expected values
        assert [token.whitespace_ for token in doc] == [" ", "", " "]
        
        # Verify the doc has the correct text
        assert doc.text == "Hello world! "
    
    def test_add_single_chunk(self):
        """Test adding a single chunk to an empty buffer."""
        buffer = TokenSourceBuffer(token_sources=[])
        
        # Create a synthetic chunk
        chunk = ChunkedResponse(
            type="chunk",
            id="chunk1",
            response_id="resp1",
            content="Hello",
            finish_reason=None
        )
        
        # Add chunk to buffer
        buffer.add_chunk(chunk)
        
        # Verify the buffer state
        assert len(buffer.token_sources) == 1
        assert buffer.token_sources[0].text == "Hello"
        assert buffer.token_sources[0].whitespace == ""  # spaCy would not add whitespace
        assert buffer.token_sources[0].chunk_ids == ["chunk1"]
        
        # Verify text reconstruction
        assert buffer.to_text() == "Hello"
        
    def test_add_multiple_chunks_simple_words(self):
        """Test adding multiple chunks with simple words."""
        buffer = TokenSourceBuffer(token_sources=[])
        
        # Create and add first chunk
        chunk1 = ChunkedResponse(
            type="chunk",
            id="chunk1",
            response_id="resp1",
            content="Hello",
            finish_reason=None
        )
        buffer.add_chunk(chunk1)
        
        # Create and add second chunk with leading space (typical LLM output)
        chunk2 = ChunkedResponse(
            type="chunk",
            id="chunk2",
            response_id="resp1",
            content=" world",
            finish_reason=None
        )
        buffer.add_chunk(chunk2)
        
        # Verify the buffer state
        assert len(buffer.token_sources) == 2
        assert buffer.token_sources[0].text == "Hello"
        assert buffer.token_sources[1].text == "world"
        assert buffer.token_sources[0].whitespace == " "  # Now has whitespace after adding chunk2
        assert buffer.token_sources[1].whitespace == ""
        # The first token's chunk_ids contains both chunk1 and chunk2 because the space from chunk2
        # gets attached to the previous token as whitespace
        assert buffer.token_sources[0].chunk_ids == ["chunk1", "chunk2"]  
        assert buffer.token_sources[1].chunk_ids == ["chunk2"]
        
        # Verify text reconstruction
        assert buffer.to_text() == "Hello world"
    
    def test_add_chunks_with_punctuation(self):
        """Test adding chunks with punctuation tokens like '!!' and '! '"""
        buffer = TokenSourceBuffer(token_sources=[])
        
        # Add "Hello" chunk
        chunk1 = ChunkedResponse(
            type="chunk", id="chunk1", response_id="resp1", 
            content="Hello", finish_reason=None
        )
        buffer.add_chunk(chunk1)
        
        # Add " world" chunk
        chunk2 = ChunkedResponse(
            type="chunk", id="chunk2", response_id="resp1", 
            content=" world", finish_reason=None
        )
        buffer.add_chunk(chunk2)
        
        # Add "!!" chunk (double exclamation mark)
        chunk3 = ChunkedResponse(
            type="chunk", id="chunk3", response_id="resp1", 
            content="!!", finish_reason=None
        )
        buffer.add_chunk(chunk3)
        
        # Verify the buffer state - spaCy tokenizes "!!" as two separate "!" tokens
        assert len(buffer.token_sources) == 4
        assert [t.text for t in buffer.token_sources] == ["Hello", "world", "!", "!"]
        assert [t.whitespace for t in buffer.token_sources] == [" ", "", "", ""]
        assert buffer.token_sources[0].chunk_ids == ["chunk1", "chunk2"]
        assert buffer.token_sources[1].chunk_ids == ["chunk2"]
        assert buffer.token_sources[2].chunk_ids == ["chunk3"]
        assert buffer.token_sources[3].chunk_ids == ["chunk3"]
        
        # Verify text reconstruction
        assert buffer.to_text() == "Hello world!!"
        
        # Add chunk with exclamation mark and space "! "
        chunk4 = ChunkedResponse(
            type="chunk", id="chunk4", response_id="resp1", 
            content="! ", finish_reason=None
        )
        buffer.add_chunk(chunk4)
        
        # Verify the updated buffer state
        assert len(buffer.token_sources) == 5
        assert [t.text for t in buffer.token_sources] == ["Hello", "world", "!", "!", "!"]
        assert [t.whitespace for t in buffer.token_sources] == [" ", "", "", "", " "]
        assert buffer.token_sources[4].chunk_ids == ["chunk4"]
        
        # Verify text reconstruction
        assert buffer.to_text() == "Hello world!!! "
    
    def test_add_chunks_with_numbers(self):
        """Test adding chunks with numeric tokens as might be generated by an LLM."""
        buffer = TokenSourceBuffer(token_sources=[])
        
        # Add numeric chunks in sequence
        chunks = [
            ChunkedResponse(type="chunk", id="chunk1", response_id="resp1", content="123", finish_reason=None),
            ChunkedResponse(type="chunk", id="chunk2", response_id="resp1", content="4", finish_reason=None),
            ChunkedResponse(type="chunk", id="chunk3", response_id="resp1", content="5", finish_reason=None)
        ]
        
        # Add chunks one by one
        for chunk in chunks:
            buffer.add_chunk(chunk)
        
        # Verify buffer state - spaCy actually tokenizes consecutive numbers as a single token
        assert len(buffer.token_sources) == 1
        assert buffer.token_sources[0].text == "12345"
        assert buffer.token_sources[0].whitespace == ""
        
        # All chunk IDs should be associated with this single token
        assert buffer.token_sources[0].chunk_ids == ["chunk1", "chunk2", "chunk3"]
        
        # Verify text reconstruction
        assert buffer.to_text() == "12345"
        
        # Add a space after the last number
        space_chunk = ChunkedResponse(
            type="chunk", id="chunk4", response_id="resp1", 
            content=" ", finish_reason=None
        )
        buffer.add_chunk(space_chunk)
        
        # Verify the updated whitespace
        assert buffer.token_sources[0].whitespace == " "
        assert buffer.token_sources[0].chunk_ids == ["chunk1", "chunk2", "chunk3", "chunk4"]
        
        # Verify text reconstruction with space
        assert buffer.to_text() == "12345 "
    
    def test_mixed_content_chunks(self):
        """Test a realistic scenario with mixed content types (text, numbers, punctuation)."""
        buffer = TokenSourceBuffer(token_sources=[])
        
        # Create a sequence that simulates a more complex LLM output
        chunk_data = [
            ("chunk1", "The"),
            ("chunk2", " answer"),
            ("chunk3", " is"),
            ("chunk4", " 42"),
            ("chunk5", "!"),
            ("chunk6", " That"),
            ("chunk7", "'s"),
            ("chunk8", " correct"),
            ("chunk9", ".")
        ]
        
        # Add all chunks
        for chunk_id, content in chunk_data:
            chunk = ChunkedResponse(
                type="chunk", 
                id=chunk_id, 
                response_id="resp1",
                content=content, 
                finish_reason=None
            )
            buffer.add_chunk(chunk)
        
        # Verify the final text reconstruction
        expected_text = "The answer is 42! That's correct."
        assert buffer.to_text() == expected_text
        
        # Check token count and verify some specific tokens
        # Note: Exact token count depends on spaCy's tokenization rules
        assert len(buffer.token_sources) > 0
        
        # Verify each token has the correct chunk_ids
        # We know "The" should be the first token and come from chunk1
        assert "chunk1" in buffer.token_sources[0].chunk_ids
        
        # Find the token containing "42" and verify it has chunk4's id
        found_42 = False
        for token in buffer.token_sources:
            if token.text == "42":
                assert "chunk4" in token.chunk_ids
                found_42 = True
                break
        assert found_42, "Could not find the token '42'"
        
        # Find an exclamation mark token and verify it has chunk5's id
        found_exclamation = False
        for token in buffer.token_sources:
            if token.text == "!":
                assert "chunk5" in token.chunk_ids
                found_exclamation = True
                break
        assert found_exclamation, "Could not find the token '!'"
    
    def test_whitespace_contribution_recorded_by_default(self):
        """Default behavior: whitespace-only chunk updates should be recorded."""
        from FlownoApp.messages.ipc_schema import ChunkedResponse
        # Start with a simple sentence ending with a period
        buffer = TokenSourceBuffer(token_sources=[])
        chunk1 = ChunkedResponse(type="chunk", id="c1", response_id="r", content="Hello.", finish_reason=None)
        buffer.add_chunk(chunk1)
        # Add a chunk that is only a leading space
        chunk2 = ChunkedResponse(type="chunk", id="c2", response_id="r", content=" world", finish_reason=None)
        buffer.add_chunk(chunk2, ignore_whitespace_only=False)
        # Period token is at index 1, whitespace-only update should be recorded
        # After first chunk tokens: ["Hello", "."]
        # After second chunk tokens: ["Hello", ".", "world"]
        # Check that '.' token has both c1 and c2
        dot_src = buffer.token_sources[1]
        assert dot_src.text == "."
        assert "c1" in dot_src.chunk_ids and "c2" in dot_src.chunk_ids
        # 'world' token has only c2
        assert buffer.token_sources[2].chunk_ids == ["c2"]
    
    def test_whitespace_contribution_ignored_when_flag_true(self):
        """When ignore_whitespace_only=True, whitespace-only updates are dropped."""
        from FlownoApp.messages.ipc_schema import ChunkedResponse
        buffer = TokenSourceBuffer(token_sources=[])
        chunk1 = ChunkedResponse(type="chunk", id="c1", response_id="r", content="Hello.", finish_reason=None)
        buffer.add_chunk(chunk1)
        chunk2 = ChunkedResponse(type="chunk", id="c2", response_id="r", content=" world", finish_reason=None)
        buffer.add_chunk(chunk2, ignore_whitespace_only=True)
        # Period token should have only its original chunk id
        dot_src = buffer.token_sources[1]
        assert dot_src.text == "."
        assert dot_src.chunk_ids == ["c1"]
        # New 'world' token still added and has c2
        assert buffer.token_sources[2].chunk_ids == ["c2"]

    def test_add_empty_chunk(self):
        """Test adding a chunk with an empty content string."""
        buffer = TokenSourceBuffer(token_sources=[])
        
        # Add a non-empty chunk first
        chunk1 = ChunkedResponse(type="chunk", id="c1", response_id="r", content="Hello", finish_reason=None)
        buffer.add_chunk(chunk1)
        initial_state = list(buffer.token_sources) # Copy the state
        
        # Add an empty chunk
        empty_chunk = ChunkedResponse(type="chunk", id="c_empty", response_id="r", content="", finish_reason=None)
        buffer.add_chunk(empty_chunk)
        
        # Verify the buffer state is unchanged
        assert buffer.token_sources == initial_state
        assert buffer.to_text() == "Hello"
        
        # Test adding empty chunk to an initially empty buffer
        empty_buffer = TokenSourceBuffer(token_sources=[])
        empty_buffer.add_chunk(empty_chunk)
        assert not empty_buffer.token_sources
        assert empty_buffer.to_text() == ""


class TestTokenSourceBufferPopPrefixSpan:
    """Tests for the new pop_prefix_span method in TokenSourceBuffer"""
    
    def test_pop_prefix_span_removes_tokens(self):
        """Test that pop_prefix_span removes tokens from the buffer."""
        # Create a buffer with some token sources
        token_sources = [
            TokenSource(text="Hello", whitespace=" ", chunk_ids=["chunk1"]),
            TokenSource(text="world", whitespace="", chunk_ids=["chunk2"]),
            TokenSource(text="!", whitespace=" ", chunk_ids=["chunk3"]),
            TokenSource(text="How", whitespace=" ", chunk_ids=["chunk4"]),
            TokenSource(text="are", whitespace=" ", chunk_ids=["chunk5"]),
            TokenSource(text="you", whitespace="?", chunk_ids=["chunk6"])
        ]
        buffer = TokenSourceBuffer(token_sources=token_sources)
        
        # Create a Doc with the buffer's content
        doc = buffer.to_doc()
        
        # Create a span representing "Hello world!"
        span = Span(doc, 0, 3)
        
        # Pop the span from the buffer
        popped_tokens = buffer.pop_prefix_span(span)
        
        # Verify that the correct tokens were popped
        assert len(popped_tokens) == 3
        assert [t.text for t in popped_tokens] == ["Hello", "world", "!"]
        assert [t.chunk_ids for t in popped_tokens] == [["chunk1"], ["chunk2"], ["chunk3"]]
        
        # Verify that the popped tokens are no longer in the buffer
        assert len(buffer.token_sources) == 3
        assert [t.text for t in buffer.token_sources] == ["How", "are", "you"]
        
        # Verify the buffer's text is correct
        assert buffer.to_text() == "How are you?"

    def test_pop_prefix_span_empty_buffer(self):
        """Test pop_prefix_span with an empty buffer."""
        buffer = TokenSourceBuffer(token_sources=[])
        doc = nlp("Test")  # Just need a Doc object to create a span
        span = Span(doc, 0, 0)  # Empty span
        
        popped_tokens = buffer.pop_prefix_span(span)
        assert len(popped_tokens) == 0
        assert len(buffer.token_sources) == 0


class TestSentenceProcessor:
    """Tests for the updated SentenceProcessor class"""
    
    def test_process_chunk_complete_sentences(self):
        """Test that process_chunk returns chunk IDs and text for complete sentences."""
        processor = SentenceProcessor()
        
        # Add chunks that form multiple sentences
        chunks = [
            ChunkedResponse(type="chunk", id="chunk1", response_id="resp1", content="This is the first sentence.", finish_reason=None),
            ChunkedResponse(type="chunk", id="chunk2", response_id="resp1", content=" This is the second sentence.", finish_reason=None),
            ChunkedResponse(type="chunk", id="chunk3", response_id="resp1", content=" And this is a partial", finish_reason=None)
        ]
        
        # Process first chunk - should not return any IDs/text since there's only one sentence
        result = processor.process_chunk(chunks[0], stream_finished=False)
        assert result == SentenceResult([], "")
        
        # Process second chunk - should return IDs and text for the first sentence
        result = processor.process_chunk(chunks[1], stream_finished=False)
        assert len(result.chunk_ids) > 0
        assert "chunk1" in result.chunk_ids
        assert result.text == "This is the first sentence. " # Note the trailing space from chunk2
        
        # Process third chunk - should return IDs and text for the second sentence
        result = processor.process_chunk(chunks[2], stream_finished=False)
        assert len(result.chunk_ids) > 0
        assert "chunk2" in result.chunk_ids
        # Default behavior (ignore_whitespace_only=False): chunk3 contributes whitespace to the period of sentence 2
        assert "chunk3" in result.chunk_ids  # Corrected assertion
        assert result.text == "This is the second sentence. " # Note the trailing space from chunk3
        
        # Finally, mark the stream as finished to get the remaining content
        result = processor.process_chunk(None, stream_finished=True)
        assert len(result.chunk_ids) > 0
        assert "chunk3" in result.chunk_ids  # Now the partial sentence is included
        assert result.text == "And this is a partial"
    
    def test_stream_finished(self):
        """Test that stream_finished returns all chunk IDs and text."""
        processor = SentenceProcessor()
        
        # Add a single chunk with a partial sentence
        chunk = ChunkedResponse(type="chunk", id="chunk1", response_id="resp1", content="This is a partial sentence", finish_reason=None)
        processor.process_chunk(chunk, stream_finished=False)
        
        # No complete sentences, so should return empty result
        assert processor.process_chunk(None, stream_finished=False) == SentenceResult([], "")
        
        # But with stream_finished, should return all chunk IDs and text
        result = processor.process_chunk(None, stream_finished=True)
        assert len(result.chunk_ids) > 0
        assert "chunk1" in result.chunk_ids
        assert result.text == "This is a partial sentence"
    
    def test_process_chunk_multiple_sentences(self):
        """Test processing multiple complete sentences in a single chunk."""
        processor = SentenceProcessor()
        
        # One chunk with multiple sentences
        chunk = ChunkedResponse(
            type="chunk", 
            id="chunk1", 
            response_id="resp1", 
            content="First sentence. Second sentence. Third sentence. Partial", 
            finish_reason=None
        )
        
        # Should return IDs and text for the first two sentences, not the last partial one
        result = processor.process_chunk(chunk, stream_finished=False)
        assert len(result.chunk_ids) > 0
        assert "chunk1" in result.chunk_ids
        assert result.text == "First sentence. Second sentence. Third sentence. " # Includes text of all complete sentences
        
        # Check remaining buffer content
        assert processor.buffer.to_text() == "Partial"
        
        # Finish stream to get the last partial sentence
        result = processor.process_chunk(None, stream_finished=True)
        assert len(result.chunk_ids) > 0
        assert "chunk1" in result.chunk_ids
        assert result.text == "Partial"
    
    def test_process_chunk_with_contractions(self):
        """Test processing chunks that form sentences with contractions."""
        processor = SentenceProcessor()
        
        # Chunks forming "I'm happy. It wasn't raining. Don't stop."
        chunks = [
            ChunkedResponse(type="chunk", id="c1", response_id="r1", content="I", finish_reason=None),
            ChunkedResponse(type="chunk", id="c2", response_id="r1", content="'m", finish_reason=None),
            ChunkedResponse(type="chunk", id="c3", response_id="r1", content=" happy", finish_reason=None),
            ChunkedResponse(type="chunk", id="c4", response_id="r1", content=".", finish_reason=None),
            ChunkedResponse(type="chunk", id="c5", response_id="r1", content=" It", finish_reason=None),
            ChunkedResponse(type="chunk", id="c6", response_id="r1", content=" was", finish_reason=None),
            ChunkedResponse(type="chunk", id="c7", response_id="r1", content="n't", finish_reason=None),
            ChunkedResponse(type="chunk", id="c8", response_id="r1", content=" raining", finish_reason=None),
            ChunkedResponse(type="chunk", id="c9", response_id="r1", content=".", finish_reason=None),
            ChunkedResponse(type="chunk", id="c10", response_id="r1", content=" Don", finish_reason=None),
            ChunkedResponse(type="chunk", id="c11", response_id="r1", content="'t", finish_reason=None),
            ChunkedResponse(type="chunk", id="c12", response_id="r1", content=" stop", finish_reason=None),
            ChunkedResponse(type="chunk", id="c13", response_id="r1", content=".", finish_reason=None),
            ChunkedResponse(type="chunk", id="c14", response_id="r1", content="", finish_reason="stop"),
        ]
        
        results = []
        for chunk in chunks:
            result = processor.process_chunk(chunk, stream_finished=chunk.finish_reason is not None)
            if result.text: # Only store results with text
                results.append(result)
                
        # Expected sentences
        expected_sentences = [
            SentenceResult(chunk_ids=['c1', 'c2', 'c3', 'c4', 'c5'], text="I'm happy. "), # Space from c5
            SentenceResult(chunk_ids=['c5', 'c6', 'c7', 'c8', 'c9', 'c10'], text="It wasn't raining. "), # Space from c10
            SentenceResult(chunk_ids=['c10', 'c11', 'c12', 'c13', 'c14'], text="Don't stop."), # Final sentence from stream_finished
        ]
        
        # Check the number of sentences yielded
        assert len(results) == len(expected_sentences), f"Expected {len(expected_sentences)} sentences, got {len(results)}"
        
        # Check each sentence content and chunk IDs (order matters)
        for i, (res, exp) in enumerate(zip(results, expected_sentences)):
            assert res.text == exp.text, f"Sentence {i} text mismatch: Expected '{exp.text}', got '{res.text}'"
            assert res.chunk_ids == exp.chunk_ids, f"Sentence {i} chunk_ids mismatch: Expected {exp.chunk_ids}, got {res.chunk_ids}"

    def test_reproduce_contraction_bug_from_log(self):
        """Reproduce the contraction bug observed in the application log, but assert correct behavior."""
        processor = SentenceProcessor()
        
        # Chunks exactly as observed in the log for "It wasn't raining."
        chunks = [
            ChunkedResponse(type="chunk", id="c1", response_id="r1", content="", finish_reason=None),
            ChunkedResponse(type="chunk", id="c2", response_id="r1", content="It", finish_reason=None),
            ChunkedResponse(type="chunk", id="c3", response_id="r1", content=" wasn", finish_reason=None),
            ChunkedResponse(type="chunk", id="c4", response_id="r1", content="'", finish_reason=None),
            ChunkedResponse(type="chunk", id="c5", response_id="r1", content="t", finish_reason=None),
            ChunkedResponse(type="chunk", id="c6", response_id="r1", content=" raining", finish_reason=None),
            ChunkedResponse(type="chunk", id="c7", response_id="r1", content=".", finish_reason=None),
            ChunkedResponse(type="chunk", id="c8", response_id="r1", content="\n", finish_reason=None),
            ChunkedResponse(type="chunk", id="c9", response_id="r1", content="", finish_reason="stop"),
        ]
        
        final_result = None
        for chunk in chunks:
            result = processor.process_chunk(
                chunk=chunk,
                stream_finished=chunk.finish_reason is not None,
                ignore_whitespace_only=False # Assuming default behavior
            )
            # Only the final call with stream_finished=True should yield text in this case
            if chunk.finish_reason == "stop":
                final_result = result
        
        # Assert that the final result matches the CORRECT expected output
        assert final_result is not None, "Final result was not captured"
        expected_correct_text = "It wasn't raining.\n" # Correct text
        # All non-empty chunks contribute to the final output when stream_finished=True
        expected_chunk_ids = ['c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'] 
        
        assert final_result.text == expected_correct_text, f"Expected correct text '{expected_correct_text}', got '{final_result.text}'"
        assert final_result.chunk_ids == expected_chunk_ids, f"Expected chunk_ids {expected_chunk_ids}, got {final_result.chunk_ids}"
