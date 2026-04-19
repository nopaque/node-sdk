/**
 * Nopaque quickstart. Run with:
 *   NOPAQUE_API_KEY=... pnpm quickstart
 */
import { Nopaque } from '@nopaque/sdk';

const client = new Nopaque();

console.log('Listing audio files in workspace:');
for await (const audio of client.audio.list({ limit: 5 })) {
  console.log(`  ${audio.id} — ${audio.fileName}`);
}
