// Verifies that both the ESM and CJS build outputs resolve cleanly.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const esmPath = resolve('./dist/index.mjs');
const cjsPath = resolve('./dist/index.cjs');
const dtsPath = resolve('./dist/index.d.ts');

if (!existsSync(esmPath)) throw new Error(`Missing ESM build: ${esmPath}`);
if (!existsSync(cjsPath)) throw new Error(`Missing CJS build: ${cjsPath}`);
if (!existsSync(dtsPath)) throw new Error(`Missing types: ${dtsPath}`);

// ESM import
const esm = await import('../../dist/index.mjs');
if (!esm.Nopaque) throw new Error('ESM export missing Nopaque class');

// CJS require
const cjs = require('../../dist/index.cjs');
if (!cjs.Nopaque) throw new Error('CJS export missing Nopaque class');

console.log('OK — dual ESM+CJS resolution verified');
