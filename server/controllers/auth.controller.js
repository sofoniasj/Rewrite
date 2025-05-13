// Rewrite/server/controllers/auth.controller.js
import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import User from '../models/user.model.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/AppError.js';

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = [
  // Validation middleware
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain alphanumeric characters and underscores'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('agreedToTerms')
    .isBoolean().withMessage('agreedToTerms must be a boolean')
    .custom(value => value === true).withMessage('You must agree to the terms and conditions'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Collect all error messages
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      return next(new AppError(errorMessages, 400));
    }

    const { username, password, agreedToTerms } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return next(new AppError('Username already exists', 400));
    }

    // Create user
    const user = await User.create({
      username,
      passwordHash: password, // Password will be hashed by pre-save hook in model
      agreedToTerms,
      // role will default to 'user'
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        token: generateToken(user.id, user.role),
      });
    } else {
      return next(new AppError('Invalid user data', 400));
    }
  }),
];

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = [
  // Validation middleware
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      return next(new AppError(errorMessages, 400));
    }

    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        token: generateToken(user.id, user.role),
      });
    } else {
      return next(new AppError('Invalid username or password', 401));
    }
  }),
];

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private (requires token)
const getUserProfile = asyncHandler(async (req, res, next) => {
  // req.user is set by the 'protect' middleware
  const user = await User.findById(req.user.id).select('-passwordHash'); // Ensure passwordHash is not sent

  if (user) {
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      agreedToTerms: user.agreedToTerms,
      createdAt: user.createdAt,
    });
  } else {
    return next(new AppError('User not found', 404));
  }
});

export { registerUser, loginUser, getUserProfile };
