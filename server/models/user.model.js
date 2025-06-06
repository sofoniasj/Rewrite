// Rewrite/server/models/user.model.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define a sub-schema for saved articles to store more context
// Define a sub-schema for saved articles to store more context
const savedArticleSchema = new mongoose.Schema({
    rootArticle: { // The top-level parent article ID
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Content',
        required: true,
    },
    // entryPointArticle: { // The specific segment ID from which the lineage was saved (could be same as rootArticle)
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Content',
    //     required: true,
    // },
    lineagePathIds: [{ // Array of Content IDs representing the saved path
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Content',
    }],
    customName: { // Optional: User can name this saved lineage
        type: String,
        trim: true,
        maxlength: 100,
    },
    savedAt: {
        type: Date,
        default: Date.now,
    },
}, {_id: true}); // Give each saved item its own unique ID for easier removal

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
    originalUsername: {
        type: String,
        trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    agreedToTerms: {
      type: Boolean,
      required: [true, 'You must agree to the terms and conditions'],
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'deleted'],
      default: 'user',
    },
    profilePicture: {
        type: String,
        default: '',
    },
    bio: {
        type: String,
        maxlength: [160, 'Bio cannot exceed 160 characters'],
        default: '',
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    pendingFollowRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationRequestedAt: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default: 'active'
    },
    // NEW: Field for saved articles/lineages
    savedArticles: [savedArticleSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.status === 'deleted') return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.passwordHash;
    // Consider if savedArticles should always be populated or fetched on demand
  },
});

const User = mongoose.model('User', userSchema);

export default User;
