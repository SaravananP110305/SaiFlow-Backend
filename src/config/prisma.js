import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: env.isDevelopment
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' }
      ]
    : [{ emit: 'stdout', level: 'error' }]
});

if (env.isDevelopment) {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

export default prisma;
