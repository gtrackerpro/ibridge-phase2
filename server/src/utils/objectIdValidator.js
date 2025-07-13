const mongoose = require('mongoose');

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId, false otherwise
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Check if it's a valid ObjectId format (24 hex characters)
  return /^[0-9a-fA-F]{24}$/.test(id) && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Middleware to validate ObjectId parameters
 * @param {string} paramName - The parameter name to validate (default: 'id')
 * @returns {Function} - Express middleware function
 */
const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate multiple ObjectId parameters
 * @param {string[]} paramNames - Array of parameter names to validate
 * @returns {Function} - Express middleware function
 */
const validateMultipleObjectIdParams = (paramNames = ['id']) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      if (id && !isValidObjectId(id)) {
        return res.status(400).json({
          message: `Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`
        });
      }
    }
    
    next();
  };
};

/**
 * Validates ObjectId in request body
 * @param {string} fieldName - The field name to validate
 * @param {boolean} required - Whether the field is required
 * @returns {Function} - Express middleware function
 */
const validateObjectIdBody = (fieldName, required = true) => {
  return (req, res, next) => {
    const id = req.body[fieldName];
    
    if (!id && required) {
      return res.status(400).json({
        message: `${fieldName} is required`
      });
    }
    
    if (id && !isValidObjectId(id)) {
      return res.status(400).json({
        message: `Invalid ${fieldName} format. Must be a valid MongoDB ObjectId.`
      });
    }
    
    next();
  };
};

module.exports = {
  isValidObjectId,
  validateObjectIdParam,
  validateMultipleObjectIdParams,
  validateObjectIdBody
};
