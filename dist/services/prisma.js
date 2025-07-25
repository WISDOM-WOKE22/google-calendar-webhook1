"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
class PrismaService {
    constructor() { }
    static getInstance() {
        if (!PrismaService.instance) {
            PrismaService.instance = new client_1.PrismaClient({
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
    static async disconnect() {
        if (PrismaService.instance) {
            await PrismaService.instance.$disconnect();
            PrismaService.instance = null;
        }
    }
}
exports.default = PrismaService.getInstance();
