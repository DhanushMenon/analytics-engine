// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analytics Engine API',
      version: '1.0.0',
      description: 'Scalable backend for website & mobile analytics',
    },
    servers: [
      { url: 'https://analytics-engine-8isx.onrender.com' }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      }
    }
  },
  // FIXED: Relative path from root to scan JSDoc
  apis: ['./routes/*.js']
};

const specs = swaggerJSDoc(options);

module.exports = { swaggerUi, specs };