// src/utils/logger.ts
import winston from 'winston';
import path from 'path';

const logsDir = path.resolve(__dirname, '../../logs');

const logger = winston.createLogger({
  level: 'info', // default level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
  ),
  transports: [
    new winston.transports.Console(), // log to console
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }), // log errors to file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }), // all logs
  ],
});

export default logger;
