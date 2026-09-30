import { Nopaque } from '@nopaque/sdk';

const CONFIG_ID = process.env.SURVEY_CONFIG_ID;
const SENDER = process.env.SURVEY_SENDER;
if (!CONFIG_ID || !SENDER) throw new Error('set SURVEY_CONFIG_ID and SURVEY_SENDER');

const client = new Nopaque();

const { numbers } = await client.surveys.list();
console.log(`Survey numbers: ${numbers.free} free of ${numbers.total}`);

const test = await client.surveys.start({ configId: CONFIG_ID, sender: SENDER, windowSecs: 300 });
console.log(`Started ${test.runId}`);
console.log(`Now send your survey from ${SENDER} to ${test.agentE164}`);
console.log(`before ${new Date(test.expiresAt * 1000).toISOString()}. Waiting...`);

const result = await client.surveys.waitForResult(test.runId, {
  onUpdate: (r) => console.log(`  capture=${r.capture.status} answers=${r.answersGiven}`),
});

console.log(`Outcome: ${result.outcome ?? '(none)'}  capture: ${result.capture.status}`);
if (result.capture.status === 'failed') console.log(`Capture error: ${result.capture.error}`);
for (const turn of result.turns) console.log(`  ${turn.from}: ${turn.text}`);
