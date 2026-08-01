import http from 'http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import logger from './src/config/logger.js';

const server = http.createServer(app);

const startServer = () => {
  server.listen(env.port, () => {
    logger.info(`=================================================`);
    logger.info(`  SaiFlow Server running in ${env.nodeEnv} mode`);
    logger.info(`  Local URL: http://localhost:${env.port}`);
    logger.info(`=================================================`);
  });
};

const handleUnexpectedError = (error) => {
  logger.error('Unexpected error detected. Closing server gracefully...', error);
  
  server.close(() => {
    logger.info('Http server closed.');
    process.exit(1);
  });

  // Force shutdown after 10s if graceful close hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  handleUnexpectedError(error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  handleUnexpectedError(reason);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  server.close(() => {
    logger.info('Http server terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  server.close(() => {
    logger.info('Http server terminated.');
    process.exit(0);
  });
});

startServer();
