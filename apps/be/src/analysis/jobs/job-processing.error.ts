export class JobProcessingError extends Error {
  constructor(
    readonly failureCode: string,
    message: string,
  ) {
    super(message);
  }
}
