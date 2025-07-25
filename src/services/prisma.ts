import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

class PrismaService {
  private static instance: PrismaClient;
  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
      });
    }

    // if (process.env.NODE_ENV === 'development') {
    //   PrismaService.instance.$on('query', (e: any) => {
    //     logger.debug('Query: ' + e.query);
    //     logger.debug('Params: ' + e.params);
    //     logger.debug('Duration: ' + e.duration + 'ms');
    //   });
    // }

    // PrismaService.instance.$on('error' as any, (e: any) => {
    //   logger.error('Prisma Error: ' + e.message);
    // });

    // PrismaService.instance.$on('info' as any, (e: any) => {
    //   logger.info('Prisma Info: ' + e.message);
    // });

    // PrismaService.instance.$on('warn', (e: any) => {
    //   logger.warn('Prisma Warning: ' + e.message);
    // });

    return PrismaService.instance;
  }

  public static async disconnect(): Promise<void> {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect();
      PrismaService.instance = null as any;
    }
  }
}

export default PrismaService.getInstance();
