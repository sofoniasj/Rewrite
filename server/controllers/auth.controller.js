// Rewrite/server/controllers/auth.controller.js
import asyncHandler from 'express-async-handler';
import { body, param, validationResult } from 'express-validator';
import crypto from 'crypto';
import axios from 'axios'; // For reCAPTCHA verification
import User from '../models/user.model.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js'; // Import email utility
import AppError from '../utils/AppError.js';

// Helper to check for validation errors
const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

/**
 * @desc    Register a new user and send verification email
 * @route   POST /api/auth/signup
 * @access  Public
 */
const registerUser = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),
  body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('agreedToTerms').isBoolean().custom(value => value === true).withMessage('You must agree to the terms.'),
  body('captchaToken').notEmpty().withMessage('CAPTCHA verification is required.'),

  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const { username, email, password, agreedToTerms, captchaToken } = req.body;

    // --- 1. Verify reCAPTCHA ---
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
    try {
        const { data: captchaResult } = await axios.post(verificationURL);
        if (!captchaResult.success) {
            return next(new AppError('CAPTCHA verification failed. Please try again.', 400));
        }
    } catch (error) {
        console.error("reCAPTCHA verification request failed:", error);
        return next(new AppError('Could not verify CAPTCHA. Please try again later.', 500));
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      if (userExists.email === email) return next(new AppError('An account with this email already exists', 400));
      if (userExists.username === username) return next(new AppError('Username is already taken', 400));
    }

    const user = new User({ username, email, passwordHash: password, agreedToTerms });
    const verificationToken = user.getEmailVerificationToken();
    await user.save();

    // --- 2. Send Verification Email ---
    const clientURL = process.env.CLIENT_URL || "http://localhost:5173";

const resetURL = `${clientURL}/reset-password/${resetToken}`;

    const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    const message = `You are receiving this email because you (or someone else) have registered an account on Rewrite. Please click the following link, or paste it into your browser to complete the process:\n\n${verifyURL}\n\nIf you did not request this, please ignore this email. This link will expire in 10 minutes.`;
    const htmlMessage = `<p>Hi ${user.username},</p><p>Please click the link below to verify your email address and activate your Rewrite account:</p><p><a href="${verifyURL}" target="_blank">Verify My Email Address</a></p><p>This link will expire in 10 minutes. If you did not create an account, please ignore this email.</p>`;
    
    try {
        await sendEmail({
            email: user.email,
            subject: 'Draft Account - Email Verification',
            message,
            html: htmlMessage,
        });
        res.status(201).json({ success: true, message: 'Registration successful! A verification email has been sent to your email address.' });
    } catch (err) {
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false }); // Save changes without re-running all validators
        console.error(err);
        return next(new AppError('Email could not be sent. Please ensure your email address is correct and try again.', 500));
    }
  }),
];

/**
 * @desc    Verify user's email from token
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = [
    body('token').notEmpty().withMessage('Verification token is required.'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });
        if (!user) return next(new AppError('Invalid or expired verification token.', 400));
        
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully! You can now log in.',
        });
    })
];

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = [
  body('username').notEmpty().withMessage('Username or Email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const { username, password } = req.body;
    const user = await User.findOne({ 
        $or: [{ username: username }, { email: username.toLowerCase() }]
    }).select('+passwordHash');
    if (!user || !(await user.matchPassword(password))) {
        return next(new AppError('Invalid credentials', 401));
    }
    if (!user.isEmailVerified) {
        return next(new AppError('Please verify your email address before logging in.', 401));
    }
    res.json({
        id: user.id, username: user.username, role: user.role, isVerified: user.isVerified,
        isPrivate: user.isPrivate, createdAt: user.createdAt, token: generateToken(user.id, user.role),
    });
  }),
];

/**
 * @desc    Request a password reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = [
    body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const user = await User.findOne({ email: req.body.email, status: 'active' });
        if (!user) {
            return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        }
        const resetToken = user.getPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        const message = `You requested a password reset. Please click the following link to complete the process:\n\n${resetURL}\n\nThis link will expire in 10 minutes. If you did not request this, please ignore this email.`;
        try {
            await sendEmail({ email: user.email, subject: 'Draft - Password Reset Request', message });
            res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return next(new AppError('Email could not be sent.', 500));
        }
    })
];

/**
 * @desc    Reset password using token from URL
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = [
    param('token').notEmpty().withMessage('Reset token is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        if (!user) return next(new AppError('Invalid or expired password reset token.', 400));
        user.passwordHash = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.json({ success: true, message: 'Password reset successful. You can now log in.' });
    })
];

/**
 * @desc    Get current user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (user) {
    res.json({
      id: user.id, username: user.username, role: user.role,
      isPrivate: user.isPrivate, isVerified: user.isVerified,
      agreedToTerms: user.agreedToTerms, createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } else {
    return next(new AppError('User not found', 404));
  }
});

export { registerUser, verifyEmail, loginUser, forgotPassword, resetPassword, getUserProfile };
