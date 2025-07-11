const mongoose = require('mongoose');

const demandSchema = new mongoose.Schema({
  demandId: {
    type: String,
    required: [true, 'Demand ID is required'],
    unique: true,
    trim: true
  },
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  positionTitle: {
    type: String,
    required: [true, 'Position title is required'],
    trim: true
  },
  primarySkill: {
    type: String,
    required: [true, 'Primary skill is required'],
    trim: true
  },
  experienceRange: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    }
  },
  secondarySkills: [{
    type: String,
    trim: true
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Fulfilled', 'Closed'],
    default: 'Open'
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validate experience range
demandSchema.pre('save', function(next) {
  if (this.experienceRange.min > this.experienceRange.max) {
    next(new Error('Minimum experience cannot be greater than maximum experience'));
  }
  next();
});

// Index for efficient searching
demandSchema.index({ primarySkill: 1, status: 1 });
demandSchema.index({ demandId: 1 });
demandSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Demand', demandSchema);