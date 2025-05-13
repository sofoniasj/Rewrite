// Rewrite/server/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';

// Middleware to protect routes that require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token's ID and attach to request object
      // Exclude passwordHash from being selected
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        return next(new AppError('No user found with this ID', 401));
      }
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Not authorized, token failed (invalid signature)', 401));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Not authorized, token expired', 401));
      }
      return next(new AppError('Not authorized, token failed', 401));
    }
  }

  if (!token) {
    return next(new AppError('Not authorized, no token provided', 401));
  }
});

// Middleware to authorize users based on role (e.g., 'admin')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(`User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route`, 403)
      );
    }
    next();
  };
};

// Specific admin authorization middleware
const admin = authorize('admin');


export { protect, admin, authorize };
