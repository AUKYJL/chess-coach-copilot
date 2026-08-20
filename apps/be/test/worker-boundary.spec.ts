import 'reflect-metadata';
import { AnalysisProcessingModule } from '../src/analysis/jobs/analysis-processing.module.js';
import { EngineAnalysisProcessor } from '../src/analysis/engine/engine-analysis.processor.js';
import { AppModule } from '../src/app.module.js';
import { WorkerModule } from '../src/worker.module.js';
import { ENGINE_ANALYSIS_QUEUE_NAME } from '../src/queues/queue.constants.js';

describe('application composition roots', () => {
  it('keeps background processors out of the HTTP application root', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(imports).not.toContain(AnalysisProcessingModule);
  });

  it('includes background processors in the worker application root', () => {
    const imports = Reflect.getMetadata('imports', WorkerModule) as unknown[];

    expect(imports).toContain(AppModule);
    expect(imports).toContain(AnalysisProcessingModule);
  });

  it('registers one serial engine processor only in the worker processing module', () => {
    const providers = Reflect.getMetadata(
      'providers',
      AnalysisProcessingModule,
    ) as unknown[];

    expect(
      providers.filter((provider) => provider === EngineAnalysisProcessor),
    ).toHaveLength(1);
    expect(
      Reflect.getMetadata('bullmq:processor_metadata', EngineAnalysisProcessor),
    ).toEqual({ name: ENGINE_ANALYSIS_QUEUE_NAME });
    expect(
      Reflect.getMetadata('bullmq:worker_metadata', EngineAnalysisProcessor),
    ).toMatchObject({ concurrency: 1 });
  });
});
