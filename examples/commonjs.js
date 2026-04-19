// Verifies the package works from CommonJS consumers.
const { Nopaque } = require('@nopaque/sdk');

const client = new Nopaque({ apiKey: process.env.NOPAQUE_API_KEY });
(async () => {
  const pages = [];
  for await (const f of client.audio.list({ limit: 3 })) pages.push(f.id);
  console.log('audio ids:', pages);
})();
