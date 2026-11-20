import { RuntimeGlobals, RuntimeModule, type Compiler } from '@rspack/core';

const MODULE_CACHE_GLOBAL = 'globalThis.__webpack_module_cache__';

// Install the sandbox's cache before any Workflow modules run. A runtime module executes
// inside the outer bootstrap, so nested, pre-bundled dependencies retain their private caches.
class WorkflowModuleCache extends RuntimeModule {
  constructor() {
    super('Temporal Workflow module cache');
  }

  override generate(): string {
    // Fail before running any Workflow if a future bootstrap uses a different private cache.
    return `if (__webpack_module_cache__ !== ${RuntimeGlobals.moduleCache}) throw new Error("Unexpected Rspack module cache");
${RuntimeGlobals.moduleCache} = __webpack_module_cache__ = ${MODULE_CACHE_GLOBAL};`;
  }
}

export class InjectWorkflowModuleCacheGlobalPlugin {
  apply(compiler: Compiler): void {
    const name = 'TemporalWorkflowModuleCachePlugin';
    compiler.hooks.thisCompilation.tap(name, (compilation) => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap(name, (chunk, requirements) => {
        requirements.add(RuntimeGlobals.moduleCache);
        compilation.addRuntimeModule(chunk, new WorkflowModuleCache());
      });
    });
  }
}

export function assertWorkflowModuleCacheGlobalApplied(code: string): void {
  if (!code.includes(MODULE_CACHE_GLOBAL)) {
    throw new Error('The Workflow bundle is missing the module cache required for Workflow isolation.');
  }
}
