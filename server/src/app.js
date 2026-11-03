const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const { LOCAL_DIR } = require('./config/cloudinary');
const logger = require('./utils/logger');
const requestId = require('./middleware/requestId');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

/** Builds the Express app. Kept separate from server.js so tests can import it without listening. */
function createApp() {
  const app = express();
  // Proxy hops in front of the API (Render = 1, Vercel rewrite + Render = 2); rate limiting keys on the client IP.
  app.set('trust proxy', env.trustProxy);

  app.use(requestId);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({ origin: env.clientUrl.split(','), credentials: true, exposedHeaders: ['X-Request-Id'] }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  if (!env.isTest) {
    morgan.token('id', (req) => req.id);
    app.use(
      morgan(':id :method :url :status :response-time ms', {
        stream: { write: (line) => logger.info(line.trim()) },
      }),
    );
  }

  app.use('/uploads', express.static(LOCAL_DIR));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(require('./config/swagger')));
  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
