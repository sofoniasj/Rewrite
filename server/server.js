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
import userRoutes from './routes/user.routes.js';

import { notFound, errorHandler } from './middleware/error.middleware.js';

dotenv.config();
connectDB();
const app = express();

// --- START OF CORS CONFIGURATION ---
// List of allowed domains
const allowedOrigins = [
   // 'https://rewrite-9ers.onrender.com',
    'https://drafting.onrender.com', // Your old render domain
    'https://www.draftiteration.com',    // Your new custom domain
    process.env.CLIENT_URL               // Any other URL from your .env file
].filter(Boolean); // This removes any undefined/null values from the list

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
        if (!origin) return callback(null, true);

        // If the request's origin is in our list of allowed origins, allow it
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
// --- END OF CORS CONFIGURATION ---


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
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Draft API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
    );
});