// Populated by tsup at build time via the `define` option.
declare const __SDK_VERSION__: string;

export const VERSION: string =
  typeof __SDK_VERSION__ === 'string' ? __SDK_VERSION__ : '0.0.0-dev';
