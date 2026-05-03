import { Nopaque } from '@nopaque/sdk';

const PHONE_NUMBER = process.env.TARGET_PHONE_NUMBER;
if (!PHONE_NUMBER) throw new Error('set TARGET_PHONE_NUMBER');

const client = new Nopaque();

const job = await client.mapping.create({
  name: 'Demo mapping',
  phoneNumber: PHONE_NUMBER,
  config: { mappingMode: 'dtmf' },
});
console.log(`Created job ${job.id}`);

await client.mapping.start(job.id);
console.log('Started run; waiting for completion...');

const final = await client.mapping.waitForComplete(job.id, {
  timeout: 900_000,
  onUpdate: (j) => console.log(`  status=${j.status}`),
});
console.log(`Final status: ${final.status}`);

const tree = await client.mapping.tree(job.id);
if (tree.stats) {
  const s = tree.stats;
  console.log(
    `Total calls: ${s.totalCalls} ` +
      `(completed=${s.completedCalls}, failed=${s.failedCalls}, loops=${s.loopsDetected})`
  );
}
