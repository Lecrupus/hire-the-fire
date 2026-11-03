const winston = require('winston');

const isProd = process.env.NODE_ENV === 'production';

/** App logger. Every line written during a request should include its requestId. */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'test' ? 'error' : 'info',
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, requestId, ...rest }) => {
          const id = requestId ? ` [${requestId}]` : '';
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level}${id} ${message}${extra}`;
        }),
      ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
