// Rewrite/server/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import colors from 'colors';

import connectDB from './config/db.js';

// Route files
import authRoutes from './routes/auth.routes.js';
import contentRoutes from './routes/content.routes.js';
import userRoutes from './routes/user.routes.js'; // <-- IMPORT NEW USER ROUTES

import { notFound, errorHandler } from './middleware/error.middleware.js';

dotenv.config();
connectDB();
const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'https://rewrite-9ers.onrender.com' || "https://www.draftiteration.com", // Vite default client port
  credentials: true
}));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', userRoutes); // <-- MOUNT NEW USER ROUTES

app.get('/', (req, res) => {
  res.send('Rewrite API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});
