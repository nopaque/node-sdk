export class NopaqueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NopaqueConfigError extends NopaqueError {}
