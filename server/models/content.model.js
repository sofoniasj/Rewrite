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
  reason: { // Optional: if you want to store a reason for the report
    type: String,
    trim: true,
    maxlength: 200
  }
}, {_id: false});


const contentSchema = new mongoose.Schema(
  {
    title: { // Only for top-level parent articles
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
    parentContent: { // For threading/replies
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      default: null,
      index: true,
    },
    // children: [ // Direct children. Can be useful but also derivable from parentContent.
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Content',
    //   },
    // ],
    likes: [ // Array of user IDs who liked this content
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: { // Denormalized count for performance in sorting/display
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    reports: [reportSchema],
    isReported: { // Quick flag for admin, true if reports array is not empty
      type: Boolean,
      default: false,
      index: true,
    },
    // You might want a status field for content (e.g., 'active', 'deleted_by_user', 'deleted_by_admin')
    // status: {
    //   type: String,
    //   enum: ['active', 'archived', 'deleted'],
    //   default: 'active'
    // }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Pre-save hook to update 'updatedAt' (Mongoose does this by default with timestamps:true)
// If you needed custom logic for updatedAt:
// contentSchema.pre('save', function (next) {
//   if (!this.isNew) {
//     this.updatedAt = Date.now();
//   }
//   next();
// });

// Update likeCount and isReported before saving
contentSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likeCount = this.likes.length;
  }
  if (this.isModified('reports')) {
    this.isReported = this.reports.length > 0;
  }
  next();
});


// Virtual for 'id'
contentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are included in toJSON output
contentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    // ret.author = ret.author.username; // Example of transforming populated author
  },
});

// Index for finding top-level articles
contentSchema.index({ parentContent: 1, createdAt: -1 });
// Index for finding children of a parent, sorted by likes and then creation date
contentSchema.index({ parentContent: 1, likeCount: -1, createdAt: 1 });


const Content = mongoose.model('Content', contentSchema);

export default Content;
