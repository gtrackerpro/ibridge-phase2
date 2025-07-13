const mongoose = require('mongoose');

const employeeProfileSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Available', 'Allocated', 'On Leave', 'Training'],
    default: 'Available'
  },
  primarySkill: {
    type: String,
    required: [true, 'Primary skill is required'],
    trim: true
  },
  primarySkillExperience: {
    type: Number,
    required: [true, 'Primary skill experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  secondarySkills: [{
    skill: {
      type: String,
      required: true,
      trim: true
    },
    experience: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  BU: {
    type: String,
    required: [true, 'Business Unit is required'],
    trim: true
  },
  resumeUrl: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  availability: {
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
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
employeeProfileSchema.index({ primarySkill: 1, status: 1 });
// Note: employeeId already has unique index from schema definition
// Note: email index not needed if not unique at schema level

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);