import { Nopaque } from '@nopaque/sdk';
import { createReadStream } from 'node:fs';

const [, , path] = process.argv;
if (!path) {
  console.error('Usage: tsx audioUpload.ts <path>');
  process.exit(1);
}

const client = new Nopaque();
const audio = await client.audio.upload({
  file: createReadStream(path),
  contentType: 'audio/wav',
  name: 'uploaded.wav',
});
console.log(`Uploaded ${audio.id}`);

await client.audio.download(audio.id, { to: 'downloaded.wav' });
console.log('Downloaded to downloaded.wav');
