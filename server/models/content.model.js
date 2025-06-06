// Rewrite/server/models/content.model.js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {_id: false});


const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    text: {
      type: String,
      required: [true, 'Content text is required'],
      trim: true,
      minlength: [1, 'Content text cannot be empty'],
      maxlength: [10000, 'Content text is too long'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentContent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      default: null,
      index: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    reports: [reportSchema],
    isReported: {
      type: Boolean,
      default: false,
      index: true,
    },
    // NEW FIELD FOR ARTICLE PRIVACY
    isPrivateToFollowers: {
        type: Boolean,
        default: false, // Default to public
    },
    // You might also want a field to track if an article is "unlisted" or "draft"
    // status: {
    //   type: String,
    //   enum: ['public', 'followers_only', 'unlisted', 'draft', 'deleted'],
    //   default: 'public'
    // }
  },
  {
    timestamps: true,
  }
);

contentSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likeCount = this.likes.length;
  }
  if (this.isModified('reports')) {
    this.isReported = this.reports.length > 0;
  }
  next();
});

contentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

contentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

contentSchema.index({ parentContent: 1, createdAt: -1 });
contentSchema.index({ parentContent: 1, likeCount: -1, createdAt: 1 });
contentSchema.index({ author: 1, createdAt: -1 }); // Index for fetching user's articles

const Content = mongoose.model('Content', contentSchema);

export default Content;
