// Rewrite/server/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import colors from 'colors'; // For console output styling

// Database connection
import connectDB from './config/db.js';

// Route files
import authRoutes from './routes/auth.routes.js';
import contentRoutes from './routes/content.routes.js';

// Middleware
import { notFound, errorHandler } from './middleware/error.middleware.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware setup
// CORS: Enable All CORS Requests for development. For production, configure specific origins.
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://rewrite-9ers.onrender.com', // Vite default client port
  credentials: true
}));


// Helmet: Set various HTTP headers for security
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Example policy

// Morgan: HTTP request logger (use 'dev' for development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);

// Basic route for testing server
app.get('/', (req, res) => {
  res.send('Rewrite API is running...');
});

// Custom error handling middleware
app.use(notFound); // Handles 404 errors for routes not found
app.use(errorHandler); // Global error handler

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});
