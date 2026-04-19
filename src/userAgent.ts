import { VERSION } from './version.js';

export function composeUserAgent(): string {
  const nodeVersion = typeof process !== 'undefined' ? process.version : 'unknown';
  return `nopaque-node/${VERSION} (node/${nodeVersion})`;
}
