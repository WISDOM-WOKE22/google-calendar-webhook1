"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
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
        if (process.env.NODE_ENV === 'development') {
            PrismaService.instance.$on('query', (e) => {
                logger_1.default.debug('Query: ' + e.query);
                logger_1.default.debug('Params: ' + e.params);
                logger_1.default.debug('Duration: ' + e.duration + 'ms');
            });
        }
        PrismaService.instance.$on('error', (e) => {
            logger_1.default.error('Prisma Error: ' + e.message);
        });
        PrismaService.instance.$on('info', (e) => {
            logger_1.default.info('Prisma Info: ' + e.message);
        });
        PrismaService.instance.$on('warn', (e) => {
            logger_1.default.warn('Prisma Warning: ' + e.message);
        });
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
