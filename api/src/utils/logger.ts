import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, '../../logs');

const consoleTransport = new winston.transports.Console({
  stderrLevels: ['error'],
});

const fileTransports: winston.transport[] = [];
if (config.env === 'production') {
  fileTransports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

export const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.env === 'production'
      ? winston.format.json()
      : winston.format.prettyPrint({ colorize: true }),
  ),
  defaultMeta: { service: 'cbc-school-api' },
  transports: [consoleTransport, ...fileTransports],
});
