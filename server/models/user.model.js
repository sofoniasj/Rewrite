import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const savedArticleSchema = new mongoose.Schema({
    rootArticle: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    lineagePathIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
    customName: { type: String, trim: true, maxlength: 100 },
    savedAt: { type: Date, default: Date.now },
}, {_id: true});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      // Updated regex to allow underscores which might be generated
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
    passwordHash: {
      type: String,
      // Password is required ONLY if authProvider is 'local'
      required: function() { return this.authProvider === 'local'; },
    },
    // --- NEW GOOGLE AUTH FIELDS ---
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

    // Existing fields
    agreedToTerms: { type: Boolean, default: false }, // Google logins implicitly agree or handle via UI
    role: { type: String, enum: ['user', 'admin', 'deleted'], default: 'user' },
    profilePicture: { type: String, default: 'https://placehold.co/100x100/A0AEC0/000000?text=U' },
    bio: { type: String, trim: true, maxlength: 200, default: '' },
    isPrivate: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingFollowRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isVerified: { type: Boolean, default: false },
    verificationRequestedAt: { type: Date },
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
    savedArticles: [savedArticleSchema],
    
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    originalUsername: String,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  // Only hash password if it exists and has been modified
  if (this.isModified('passwordHash') && this.passwordHash) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    } catch (error) {
      return next(error);
    }
  }

  // Generate verification token only for new, unverified LOCAL users
  if (this.isNew && !this.isVerified && this.authProvider === 'local') {
      this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      this.emailVerificationExpires = Date.now() + 48 * 60 * 60 * 1000; 
  }
  
  if (this.isModified('following')) this.followingCount = this.following.length;
  if (this.isModified('followers')) this.followerCount = this.followers.length;

  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.status === 'deleted' || !this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.getEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    // Note: In previous steps we hashed it. Consistency is key. 
    // If you hashed in controller, store hash here.
    // For simplicity based on previous file, we will store raw token logic in controller usually.
    return verificationToken;
};

userSchema.methods.getPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; 
    return resetToken;
};

userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', { virtuals: true, versionKey: false, transform: function (doc, ret) { delete ret._id; delete ret.passwordHash; }});

const User = mongoose.model('User', userSchema);
export default User;