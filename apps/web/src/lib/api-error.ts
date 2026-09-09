export class ApiRequestError extends Error {
  readonly status: number;
  constructor(status: number, path: string) {
    super(`API ${status}: ${path}`);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}
