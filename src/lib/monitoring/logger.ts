import { createLogger, format, transports, Logger } from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

const loggerConfig: any = {
  level: logLevel,
  format: logFormat === 'json' ? format.json() : format.simple(),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
  ],
};

if (process.env.LOG_FILE) {
  loggerConfig.transports.push(
    new transports.File({
      filename: process.env.LOG_FILE,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    })
  );
}

export const logger = createLogger(loggerConfig);

export function createChildLogger(module: string): Logger {
  return logger.child({ module });
}

export function logError(error: Error, context?: any): void {
  logger.error(error.message, {
    error: error.stack,
    context,
  });
}
