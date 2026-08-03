import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import logger from './config/logger.js';
import routes from './routes/index.js';
import { rateLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Secure App with Helmet headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g., curl, Postman, mobile apps)
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

// Cookie Parser
app.use(cookieParser());

// Rate Limiting
app.use('/api', rateLimiter);

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// HTTP Request logging with Morgan & Winston
const morganFormat = env.isProduction ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Base Root Redirect to Health Check
app.get('/', (req, res) => {
  res.redirect('/api/v1/health');
});

// API Routes mounting
app.use('/api/v1', routes);

// 404 Route Not Found Catch
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
