/* Dependency Injection example */

export interface IDummyService {
  returnSomething(): Promise<string>;
}

export class DummyService implements IDummyService {
  constructor() {
    console.log("DummyService instance created");
  }

  async returnSomething(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return "Hello from DummyService!";
  }
}
