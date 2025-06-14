// Rewrite/server/models/user.model.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // For generating tokens

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores']
    },
    // NEW: Email Field
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [ /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address' ]
    },
    originalUsername: { type: String, trim: true },
    passwordHash: { type: String, required: [true, 'Password is required'] },
    agreedToTerms: { type: Boolean, required: true, default: false },
    role: { type: String, enum: ['user', 'admin', 'deleted'], default: 'user' },
    profilePicture: { type: String, default: '' },
    bio: { type: String, maxlength: [160, 'Bio cannot exceed 160 characters'], default: '' },
    isPrivate: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingFollowRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isVerified: { type: Boolean, default: false },
    verificationRequestedAt: { type: Date },
    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
    savedArticles: [{
        rootArticle: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
        lineagePathIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
        customName: { type: String, trim: true, maxlength: 100 },
        savedAt: { type: Date, default: Date.now },
    }],
    
    // --- NEW: Fields for Email Verification & Password Reset ---
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

  },
  { timestamps: true }
);

// --- NEW: Methods for generating tokens ---
// Generate and hash email verification token
userSchema.methods.getEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes
    return verificationToken;
};

// Generate and hash password reset token
userSchema.methods.getPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes
    return resetToken;
};

// Pre-save middleware to hash password (remains the same)
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) { next(error); }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.status === 'deleted') return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', { virtuals: true, versionKey: false, transform: function (doc, ret) { delete ret._id; delete ret.passwordHash; }});

const User = mongoose.model('User', userSchema);
export default User;
