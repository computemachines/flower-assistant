/* Dependency Injection example */

export interface IDummyService {
  returnSomething(): string;
}

export class DummyService implements IDummyService {
  constructor() {
    console.log("DummyService instance created");
  }

  returnSomething(): string {
    return "Hello from DummyService!";
  }
}
