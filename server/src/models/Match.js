const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  demandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Demand',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile',
    required: true
  },
  matchType: {
    type: String,
    enum: ['Exact', 'Near', 'Not Eligible'],
    required: true
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  missingSkills: [{
    type: String,
    trim: true
  }],
  skillsMatched: [{
    skill: {
      type: String,
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    employeeExperience: {
      type: Number,
      required: true
    },
    requiredExperience: {
      type: Number,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Training Required'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
matchSchema.index({ demandId: 1, matchScore: -1 });
matchSchema.index({ employeeId: 1 });
matchSchema.index({ matchType: 1, status: 1 });

module.exports = mongoose.model('Match', matchSchema);