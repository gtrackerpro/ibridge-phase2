const mongoose = require('mongoose');

const trainingPlanSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile',
    required: true
  },
  demandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Demand'
  },
  skillsToTrain: [{
    skill: {
      type: String,
      required: true,
      trim: true
    },
    currentLevel: {
      type: Number,
      default: 0,
      min: 0
    },
    targetLevel: {
      type: Number,
      required: true,
      min: 0
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    }
  }],
  resourceLinks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['Course', 'Documentation', 'Video', 'Book', 'Certification'],
      default: 'Course'
    },
    estimatedHours: {
      type: Number,
      min: 0
    }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Assigned', 'In Progress', 'Completed', 'On Hold'],
    default: 'Draft'
  },
  startDate: {
    type: Date
  },
  targetCompletionDate: {
    type: Date
  },
  actualCompletionDate: {
    type: Date
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
trainingPlanSchema.index({ employeeId: 1, status: 1 });
trainingPlanSchema.index({ assignedBy: 1 });

module.exports = mongoose.model('TrainingPlan', trainingPlanSchema);