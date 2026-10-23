import { createApp } from './app';
import { ENV } from './config/env';
import { searchService } from './services/searchService';
import { RecoveryService } from './services/recoveryService';

const app = createApp();

const startServer = async () => {
  try {
    // 1. Initialize Elasticsearch index mappings
    await searchService.initIndex().catch((err) => {
      console.warn('[Server Startup] Elasticsearch warning:', err.message);
    });

    // 2. Perform restart reconciliation
    await RecoveryService.reconcilePendingJobs().catch((err) => {
      console.warn('[Server Startup] Reconciliation warning:', err.message);
    });

    // 3. Start Express HTTP server
    app.listen(ENV.PORT, () => {
      console.log(`Server listening on port ${ENV.PORT}`);
      console.log(`API URL: http://localhost:${ENV.PORT}`);
      console.log(`Bull Board: http://localhost:${ENV.PORT}/admin/queues`);
    });
  } catch (err: any) {
    console.error('[Server Startup Fatal Error]', err);
    process.exit(1);
  }
};

startServer();
