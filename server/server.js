// Rewrite/server/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import colors from 'colors';
import path from 'path';
import fs from 'fs';

// --- For SSR ---
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import App from '../client/src/App.js'; // Make sure this path ends in .js if not using Babel

import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import contentRoutes from './routes/content.routes.js';
import userRoutes from './routes/user.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

dotenv.config();
connectDB();
const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'https://rewrite-9ers.onrender.com',
  credentials: true
}));

app.use(helmet.contentSecurityPolicy({
  directives: {
    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
    "script-src": ["'self'", "'unsafe-inline'", "https://www.google.com", "https://www.gstatic.com"]
  }
}));

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', userRoutes);

// --- Static Assets & SSR ---
const __dirname = path.resolve();

// Serve static files like sitemap.xml or verification files
app.use(express.static(path.join(__dirname, 'client', 'dist', 'server', 'public')));

// Serve frontend build files
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// SSR Handler
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }

  const indexHtmlPath = path.resolve(__dirname, 'client', 'dist', 'index.html');

  fs.readFile(indexHtmlPath, 'utf8', (err, htmlData) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('An error occurred');
    }

    const helmetContext = {};

    // ⛔ JSX removed — using createElement instead
    const appHtml = ReactDOMServer.renderToString(
      React.createElement(
        StaticRouter,
        { location: req.originalUrl },
        React.createElement(
          HelmetProvider,
          { context: helmetContext },
          React.createElement(App)
        )
      )
    );

    const { helmet } = helmetContext;

    const finalHtml = htmlData
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
      .replace('</head>', `${helmet.title.toString()}${helmet.meta.toString()}${helmet.link.toString()}</head>`);

    res.send(finalHtml);
  });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Server listen
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
});
