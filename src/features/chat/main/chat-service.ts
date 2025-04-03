import { PythonRunner } from "electron-flowno-bridge";

export class ChatService {
  constructor(private pythonRunner: PythonRunner) {}

  async processMessage(message: string): Promise<string> {
    try {
      // Implementation depends on PythonRunner's actual API
      // return await this.pythonRunner.runInference(message);
      return "Processed message: " + message; // Placeholder implementation
    } catch (error) {
      console.error("Chat processing failed:", error);
      throw error;
    }
  }
}
