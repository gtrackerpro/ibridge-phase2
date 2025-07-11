const mongoose = require('mongoose');

const trainingResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  type: {
    type: String,
    enum: ['Course', 'Documentation', 'Video', 'Book', 'Certification', 'Tutorial', 'Workshop'],
    required: true,
    default: 'Course'
  },
  provider: {
    type: String,
    trim: true,
    maxlength: [100, 'Provider name cannot exceed 100 characters']
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    max: [1000, 'Estimated hours cannot exceed 1000']
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  associatedSkills: [{
    type: String,
    required: true,
    trim: true
  }],
  keywords: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['Programming', 'Frontend', 'Backend', 'Database', 'Cloud', 'Mobile', 'Data', 'DevOps', 'Management', 'Design'],
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  cost: {
    type: String,
    enum: ['Free', 'Paid', 'Subscription'],
    default: 'Free'
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient searching
trainingResourceSchema.index({ associatedSkills: 1, category: 1 });
trainingResourceSchema.index({ keywords: 1 });
trainingResourceSchema.index({ type: 1, difficulty: 1 });
trainingResourceSchema.index({ isActive: 1 });

module.exports = mongoose.model('TrainingResource', trainingResourceSchema);