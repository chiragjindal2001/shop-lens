import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Connection string (ending in "/") of the one in-memory MongoDB shared by every test file. */
    mongoUri: string;
  }
}

/**
 * One in-memory MongoDB for the whole run, instead of one per test file. Each file gets its own database inside
 * it (see startTestEnv). A MongoDB instance pre-allocates ~250 MB of journal files, so 15 files used to need
 * ~4 GB of free disk at once, and a nearly full disk made the whole suite fail at load.
 */
export default async function setup(project: TestProject) {
  const mongod = await MongoMemoryServer.create();
  project.provide('mongoUri', mongod.getUri());
  return async () => {
    await mongod.stop();
  };
}
