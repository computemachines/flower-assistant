from flowno import FlowHDL, node

class Dummy:
    def __init__(self):
        print("Python: Creating Dummy instance", flush=True)
        
    def run(self):
        print("Python: Dummy.run() starting", flush=True)
        print("Python: Dummy.run() ending", flush=True)

app = Dummy()