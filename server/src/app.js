import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app = express();

// Security headers
app.use(helmet());

// Allow only our React app to call this API, and allow cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Read JSON bodies and cookies from requests
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Health check: a quick way to see that the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Unknown route
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler: any error thrown anywhere ends up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong',
  });
});

export default app;