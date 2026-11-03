const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

/** OpenAPI document generated from the @openapi comments in src/routes. Served at /api/docs. */
module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Hire the Fire API',
      version: '1.0.0',
      description:
        'Every response is { success, data, message } on success and { success: false, error: { code, message, details } } on failure.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
  },
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
});
