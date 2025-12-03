import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    // New fields for email verification
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // Existing fields
    isPrivate: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    profilePicture: { type: String, default: 'https://placehold.co/100x100/A0AEC0/000000?text=U' },
    bio: { type: String, trim: true, maxlength: 200, default: '' },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followingCount: { type: Number, default: 0, min: 0 },
    followerCount: { type: Number, default: 0, min: 0, index: true },
    isAdmin: { type: Boolean, default: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// Pre-save hook to hash password and generate verification token on creation
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  // Generate verification token only upon creation and if not verified
  if (this.isNew && !this.isVerified) {
      this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      // Token expires in 48 hours
      this.emailVerificationExpires = Date.now() + 48 * 60 * 60 * 1000; 
  }
  
  // Update counts
  if (this.isModified('following')) this.followingCount = this.following.length;
  if (this.isModified('followers')) this.followerCount = this.followers.length;

  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};


userSchema.set('toJSON', { virtuals: true, versionKey: false, transform: function (doc, ret) { delete ret._id; delete ret.password; }});

const User = mongoose.model('User', userSchema);
export default User;