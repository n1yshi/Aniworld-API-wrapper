export class AniWorldError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AniWorldError";
    this.cause = options.cause;
    this.status = options.status ?? null;
    this.url = options.url ?? null;
  }
}
