/**
 * Temporal Worker
 * Runs workflows and activities
 */

import { NestFactory } from '@nestjs/core';
import { Worker } from '@temporalio/worker';
import { Logger } from '@nestjs/common';
import * as activities from './activities';
import { AppModule } from '../app.module';

async function runWorker() {
  const logger = new Logger('TemporalWorker');

  try {
    // Create NestJS application context for dependency injection
    const app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get('ConfigService');

    const address = configService.get('TEMPORAL_ADDRESS') || 'localhost:7233';
    const namespace = configService.get('TEMPORAL_NAMESPACE') || 'default';

    logger.log(
      `Starting Temporal worker, connecting to ${address}, namespace: ${namespace}`,
    );

    const worker = await Worker.create({
      workflowsPath: require.resolve('./workflows'),
      activities,
      taskQueue: 'gloria-workflows',
      namespace,
    });

    logger.log('Temporal worker started, polling for tasks...');

    await worker.run();
  } catch (error) {
    logger.error('Failed to start Temporal worker', error);
    process.exit(1);
  }
}

// Run worker if this file is executed directly
if (require.main === module) {
  runWorker().catch((err) => {
    console.error('Worker error:', err);
    process.exit(1);
  });
}

export { runWorker };
