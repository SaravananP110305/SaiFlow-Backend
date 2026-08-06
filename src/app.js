import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import logger from './config/logger.js';
import routes from './routes/index.js';
import { rateLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Secure App with Helmet headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: env.corsOrigins,
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

// HTTP Request logging with Morgan & Winston (production only, so the
// development terminal stays clean)
if (env.isProduction) {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Base Root Redirect to Health Check
app.get('/', (req, res) => {
  res.redirect('/api/v1/health');
});

// Serve uploaded files (avatars, etc.) statically.
// The Cross-Origin-Resource-Policy header is relaxed to 'cross-origin' only
// for /uploads so the frontend origin (e.g. http://localhost:5173) is allowed
// to load avatar images from this API server. Helmet's default of
// 'same-origin' would silently block those cross-origin <img> requests.
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '..', 'uploads'))
);

// API Routes mounting
app.use('/api/v1', routes);

// 404 Route Not Found Catch
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
