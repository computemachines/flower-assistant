from typing import Any, final
from flowno import FlowHDL, node, Stream, AsyncQueue, sleep
import traceback
import nodejs_callback_bridge


@node(stream_in=["response_chunks"])
async def SendToGUI(response_chunks: Stream[str]):
    if response_chunks:
        async for chunk in response_chunks:
            print(f"[FlownoApp] Sending chunk to GUI: {chunk}")
            nodejs_callback_bridge.send_message(chunk)

@final
class ChatApp:
    def __init__(self):
        self.prompt_queue = AsyncQueue[str]()

    def run(self):

        @node
        async def ReceiveUserInput():
            print("[FlownoApp] Waiting for user input...")
            prompt = await self.prompt_queue.get()
            print(f"[FlownoApp] Received user input: {prompt}")
            return prompt

        @node
        async def DummyInference(prompt: str):
            print(f"[FlownoApp] Processing prompt: {prompt}")
            yield "thinking... "

            for word in prompt.split():
                # Simulate some processing time
                await sleep(0.1)
                yield word.capitalize()

        # There are no cycles here so this will only run once
        with FlowHDL() as f:
            
            f.receive_user_input = ReceiveUserInput()
            f.dummy_inference = DummyInference(f.receive_user_input)
            f.send_to_gui = SendToGUI(f.dummy_inference)
            
        self.f = f
            
        try:
            self.f.run_until_complete()
        except Exception as e:
            print(f"Flow execution failed: {e}")
            # Print detailed exception information
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception details: {str(e)}")
            print("Traceback:")
            traceback.print_exc()

    async def enqueue_prompt(self, prompt: str):
        """Enqueue a prompt for processing."""
        print(f"[FlownoApp] Enqueuing prompt: {prompt}")
        await self.prompt_queue.put(prompt)

    def handle_message(self, channel: str, message: Any):
        """Invoked by the NodeJS callback bridge when a message is received.
        
        This runs in the NodeJS thread. None of the AsyncQueue async methods
        can be called here."""
        
        print(f"[FlownoApp] Received message: {message}")
        print(f"[FlownoApp] Processing message on channel: {channel}")
        _ = self.f.create_task(
            self.enqueue_prompt(message)
        )


app = ChatApp()
nodejs_callback_bridge.register_message_listener(lambda message: app.handle_message(channel="default_channel", message=message))
