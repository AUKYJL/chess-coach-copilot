import 'reflect-metadata';
import { AnalysisProcessingModule } from '../src/analysis/jobs/analysis-processing.module.js';
import { AppModule } from '../src/app.module.js';
import { WorkerModule } from '../src/worker.module.js';

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
});
