const { 
  validateEmployeeProfile, 
  validateDemand, 
  validateUserRegistration, 
  validateTrainingPlan,
  sanitizeInput 
} = require('../utils/validation');

/**
 * Middleware to validate employee profile data
 */
const validateEmployeeProfileMiddleware = (req, res, next) => {
  try {
    // Sanitize input
    req.body = sanitizeInput(req.body);
    
    const validation = validateEmployeeProfile(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    res.status(500).json({
      message: 'Internal server error during validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Validation error'
    });
  }
};

/**
 * Middleware to validate demand data
 */
const validateDemandMiddleware = (req, res, next) => {
  try {
    // Sanitize input
    req.body = sanitizeInput(req.body);
    
    const validation = validateDemand(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    res.status(500).json({
      message: 'Internal server error during validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Validation error'
    });
  }
};

/**
 * Middleware to validate user registration data
 */
const validateUserRegistrationMiddleware = (req, res, next) => {
  try {
    // Sanitize input
    req.body = sanitizeInput(req.body);
    
    const validation = validateUserRegistration(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    res.status(500).json({
      message: 'Internal server error during validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Validation error'
    });
  }
};

/**
 * Middleware to validate training plan data
 */
const validateTrainingPlanMiddleware = (req, res, next) => {
  try {
    // Sanitize input
    req.body = sanitizeInput(req.body);
    
    const validation = validateTrainingPlan(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    res.status(500).json({
      message: 'Internal server error during validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Validation error'
    });
  }
};

/**
 * General input sanitization middleware
 */
const sanitizeInputMiddleware = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }
    if (req.params) {
      req.params = sanitizeInput(req.params);
    }
    next();
  } catch (error) {
    console.error('Sanitization middleware error:', error);
    res.status(500).json({
      message: 'Internal server error during input sanitization'
    });
  }
};

module.exports = {
  validateEmployeeProfileMiddleware,
  validateDemandMiddleware,
  validateUserRegistrationMiddleware,
  validateTrainingPlanMiddleware,
  sanitizeInputMiddleware
};