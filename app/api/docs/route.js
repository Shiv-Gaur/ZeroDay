import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WEBSCOPE API',
      version: '1.0.0',
      description: 'Multi-layer web scraping platform API',
    },
    servers: [{ url: process.env.NEXTAUTH_URL || 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        sessionAuth: { type: 'apiKey', in: 'cookie', name: 'next-auth.session-token' },
      },
    },
  },
  apis: ['./app/api/**/*.js'],
};

export async function GET() {
  try {
    const spec = swaggerJsdoc(options);
    return Response.json(spec);
  } catch (error) {
    return Response.json({ error: 'Failed to generate API spec' }, { status: 500 });
  }
}
