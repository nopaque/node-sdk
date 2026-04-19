import { resolveConfig, type NopaqueOptions } from './config.js';
import { Transport } from './transport.js';
import { AudioResource } from './resources/audio.js';
import { BatchesResource } from './resources/batches.js';
import { DatasetsResource } from './resources/datasets.js';
import { EnrichmentResource } from './resources/enrichment.js';
import { LoadTestingResource } from './resources/loadTesting.js';
import { MappingResource } from './resources/mapping.js';
import { ProfilesResource } from './resources/profiles.js';
import { SchedulerResource } from './resources/scheduler.js';
import { SweepsResource } from './resources/sweeps.js';
import { TestingResource } from './resources/testing.js';

export class Nopaque {
  readonly mapping: MappingResource;
  readonly audio: AudioResource;
  readonly profiles: ProfilesResource;
  readonly testing: TestingResource;
  readonly batches: BatchesResource;
  readonly sweeps: SweepsResource;
  readonly datasets: DatasetsResource;
  readonly loadTesting: LoadTestingResource;
  readonly scheduler: SchedulerResource;
  readonly enrichment: EnrichmentResource;

  private readonly transport: Transport;

  constructor(options: NopaqueOptions = {}) {
    const config = resolveConfig(options);
    this.transport = new Transport(config);
    this.mapping = new MappingResource(this.transport);
    this.audio = new AudioResource(this.transport);
    this.profiles = new ProfilesResource(this.transport);
    this.testing = new TestingResource(this.transport);
    this.batches = new BatchesResource(this.transport);
    this.sweeps = new SweepsResource(this.transport);
    this.datasets = new DatasetsResource(this.transport);
    this.loadTesting = new LoadTestingResource(this.transport);
    this.scheduler = new SchedulerResource(this.transport);
    this.enrichment = new EnrichmentResource(this.transport);
  }

  close(): void {
    // Reserved for future cleanup; platform fetch requires no teardown.
  }
}
