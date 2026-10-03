process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
});

import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const start = async () => {
  try {
    await prisma.$connect();
    app.listen(env.PORT, () => {
      console.log(`🚀 API escuchando en http://localhost:${env.PORT}`);
      console.log(`   Prueba:  http://sanmartin.localhost:${env.PORT}/health`);
    });
  } catch (err) {
    console.error('Error al iniciar:', err);
    process.exit(1);
  }
};

start();