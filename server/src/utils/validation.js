const validator = require('validator');

/**
 * Validate employee profile data
 */
function validateEmployeeProfile(data) {
  const errors = [];

  // Required fields
  if (!data.employeeId || !data.employeeId.trim()) {
    errors.push('Employee ID is required');
  }

  if (!data.name || !data.name.trim()) {
    errors.push('Name is required');
  }

  if (!data.email || !data.email.trim()) {
    errors.push('Email is required');
  } else if (!validator.isEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!data.primarySkill || !data.primarySkill.trim()) {
    errors.push('Primary skill is required');
  }

  if (data.primarySkillExperience === undefined || data.primarySkillExperience === null) {
    errors.push('Primary skill experience is required');
  } else if (!Number.isInteger(Number(data.primarySkillExperience)) || Number(data.primarySkillExperience) < 0) {
    errors.push('Primary skill experience must be a non-negative integer');
  }

  if (!data.BU || !data.BU.trim()) {
    errors.push('Business Unit (BU) is required');
  }

  // Validate status if provided
  if (data.status && !['Available', 'Allocated', 'On Leave', 'Training'].includes(data.status)) {
    errors.push('Invalid status. Must be one of: Available, Allocated, On Leave, Training');
  }

  // Validate secondary skills if provided
  if (data.secondarySkills && Array.isArray(data.secondarySkills)) {
    data.secondarySkills.forEach((skill, index) => {
      if (!skill.skill || !skill.skill.trim()) {
        errors.push(`Secondary skill ${index + 1}: Skill name is required`);
      }
      if (skill.experience === undefined || skill.experience === null) {
        errors.push(`Secondary skill ${index + 1}: Experience is required`);
      } else if (!Number.isInteger(Number(skill.experience)) || Number(skill.experience) < 0) {
        errors.push(`Secondary skill ${index + 1}: Experience must be a non-negative integer`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate demand data
 */
function validateDemand(data) {
  const errors = [];

  // Required fields
  if (!data.demandId || !data.demandId.trim()) {
    errors.push('Demand ID is required');
  }

  if (!data.accountName || !data.accountName.trim()) {
    errors.push('Account name is required');
  }

  if (!data.projectName || !data.projectName.trim()) {
    errors.push('Project name is required');
  }

  if (!data.positionTitle || !data.positionTitle.trim()) {
    errors.push('Position title is required');
  }

  if (!data.primarySkill || !data.primarySkill.trim()) {
    errors.push('Primary skill is required');
  }

  // Validate experience range
  if (!data.experienceRange) {
    errors.push('Experience range is required');
  } else {
    if (data.experienceRange.min === undefined || data.experienceRange.min === null) {
      errors.push('Minimum experience is required');
    } else if (!Number.isInteger(Number(data.experienceRange.min)) || Number(data.experienceRange.min) < 0) {
      errors.push('Minimum experience must be a non-negative integer');
    }

    if (data.experienceRange.max === undefined || data.experienceRange.max === null) {
      errors.push('Maximum experience is required');
    } else if (!Number.isInteger(Number(data.experienceRange.max)) || Number(data.experienceRange.max) < 0) {
      errors.push('Maximum experience must be a non-negative integer');
    }

    if (data.experienceRange.min !== undefined && data.experienceRange.max !== undefined) {
      if (Number(data.experienceRange.min) > Number(data.experienceRange.max)) {
        errors.push('Minimum experience cannot be greater than maximum experience');
      }
    }
  }

  if (!data.startDate) {
    errors.push('Start date is required');
  } else if (!validator.isISO8601(data.startDate.toString())) {
    errors.push('Please provide a valid start date');
  }

  // Validate optional fields
  if (data.endDate && !validator.isISO8601(data.endDate.toString())) {
    errors.push('Please provide a valid end date');
  }

  if (data.priority && !['Low', 'Medium', 'High', 'Critical'].includes(data.priority)) {
    errors.push('Invalid priority. Must be one of: Low, Medium, High, Critical');
  }

  if (data.status && !['Open', 'In Progress', 'Fulfilled', 'Closed'].includes(data.status)) {
    errors.push('Invalid status. Must be one of: Open, In Progress, Fulfilled, Closed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate user registration data
 */
function validateUserRegistration(data) {
  const errors = [];

  if (!data.name || !data.name.trim()) {
    errors.push('Name is required');
  } else if (data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (data.name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  if (!data.email || !data.email.trim()) {
    errors.push('Email is required');
  } else if (!validator.isEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!data.password) {
    errors.push('Password is required');
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  } else if (data.password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (data.role && !['Admin', 'RM', 'Manager', 'Employee', 'HR'].includes(data.role)) {
    errors.push('Invalid role. Must be one of: Admin, RM, Manager, Employee, HR');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate training plan data
 */
function validateTrainingPlan(data) {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee ID is required');
  }

  if (!data.skillsToTrain || !Array.isArray(data.skillsToTrain) || data.skillsToTrain.length === 0) {
    errors.push('At least one skill to train is required');
  } else {
    data.skillsToTrain.forEach((skill, index) => {
      if (!skill.skill || !skill.skill.trim()) {
        errors.push(`Skill ${index + 1}: Skill name is required`);
      }
      if (skill.targetLevel === undefined || skill.targetLevel === null) {
        errors.push(`Skill ${index + 1}: Target level is required`);
      } else if (!Number.isInteger(Number(skill.targetLevel)) || Number(skill.targetLevel) < 0) {
        errors.push(`Skill ${index + 1}: Target level must be a non-negative integer`);
      }
      if (skill.priority && !['Low', 'Medium', 'High'].includes(skill.priority)) {
        errors.push(`Skill ${index + 1}: Invalid priority. Must be one of: Low, Medium, High`);
      }
    });
  }

  if (data.targetCompletionDate && !validator.isISO8601(data.targetCompletionDate.toString())) {
    errors.push('Please provide a valid target completion date');
  }

  if (data.status && !['Draft', 'Assigned', 'In Progress', 'Completed', 'On Hold'].includes(data.status)) {
    errors.push('Invalid status. Must be one of: Draft, Assigned, In Progress, Completed, On Hold');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Enhanced input sanitization with XSS protection
 */
function sanitizeInput(data) {
  if (typeof data === 'string') {
    // Trim whitespace and escape HTML entities
    let sanitized = data.trim();
    
    // Remove potential XSS patterns
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Escape HTML entities
    return validator.escape(sanitized);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}

module.exports = {
  validateEmployeeProfile,
  validateDemand,
  validateUserRegistration,
  validateTrainingPlan,
  sanitizeInput
};