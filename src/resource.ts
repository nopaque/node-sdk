import type { Transport } from './transport.js';

export class Resource {
  constructor(protected readonly transport: Transport) {}
}
