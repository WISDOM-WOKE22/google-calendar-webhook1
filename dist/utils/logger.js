"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.resolve(__dirname, '../../logs');
const logger = winston_1.default.createLogger({
    level: 'info', // default level
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.prettyPrint()),
    transports: [
        new winston_1.default.transports.Console(), // log to console
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
        }), // log errors to file
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log'),
        }), // all logs
    ],
});
exports.default = logger;
