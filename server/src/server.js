import 'dotenv/config'; // must be the FIRST import so env variables load early
import mongoose from 'mongoose';
import { loadEnv } from './config/env.js';
import { connectDB } from './config/db.js';

// Stops here with a clear message if a setting is missing or weak
loadEnv();
// Loaded after the check, so every module sees the validated values and defaults
const { default: app } = await import('./app.js');

const PORT = Number(process.env.PORT);

await connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV})`);
});

// Render sends SIGTERM before a redeploy or sleep: finish open requests, then close the database
let closing = false;
const shutdown = (signal) => {
  if (closing) return;
  closing = true;
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(1), 10_000).unref(); // never hang the deploy
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  server.closeIdleConnections();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
