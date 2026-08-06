import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: env.isProduction
    ? [{ emit: 'stdout', level: 'error' }]
    : [
        // SQL query logging is opt-in (PRISMA_QUERY_LOG=true) to keep the
        // terminal clean during development. The 'info' level is omitted too,
        // otherwise Prisma prints 'Starting a postgresql pool...' on startup.
        ...(env.logQueries ? [{ emit: 'event', level: 'query' }] : []),
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' }
      ]
});

if (env.logQueries) {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

export default prisma;
