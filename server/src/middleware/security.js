const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');

/**
 * Enhanced authentication rate limiting
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Custom key generator to include user agent
  keyGenerator: (req) => {
    return req.ip + ':' + req.get('User-Agent');
  }
});

/**
 * General API rate limiting
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict rate limiting for sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // limit each IP to 1000 requests per hour
  message: {
    error: 'Too many sensitive operations, please try again later',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Enhanced helmet configuration for security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for API usage
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true
});

/**
 * Input validation middleware for SQL injection and XSS prevention
 */
const validateInput = (req, res, next) => {
  const checkForMaliciousPatterns = (input) => {
    if (typeof input !== 'string') return false;
    
    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /('|(\\')|(;)|(\\)|(--)|(\s))/i,
      /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/i
    ];
    
    // XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<[^>]*>/g
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input)) || 
           xssPatterns.some(pattern => pattern.test(input));
  };
  
  const validateObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          if (checkForMaliciousPatterns(obj[key])) {
            return { isValid: false, field: key };
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = validateObject(obj[key]);
          if (!result.isValid) return result;
        }
      }
    }
    return { isValid: true };
  };
  
  // Validate request body
  if (req.body) {
    const bodyValidation = validateObject(req.body);
    if (!bodyValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid input detected',
        field: bodyValidation.field
      });
    }
  }
  
  // Validate query parameters
  if (req.query) {
    const queryValidation = validateObject(req.query);
    if (!queryValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid query parameter detected',
        field: queryValidation.field
      });
    }
  }
  
  next();
};

/**
 * IP whitelist middleware (optional, for production)
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && allowedIPs.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      
      if (!allowedIPs.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access denied from this IP address'
        });
      }
    }
    next();
  };
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const method = req.method;
  const url = req.originalUrl;
  const user = req.user ? req.user.email : 'Anonymous';
  
  // Log security-relevant requests
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    console.log(`[SECURITY] ${timestamp} - ${ip} - ${user} - ${method} ${url} - ${userAgent}`);
  }
  
  // Log failed authentication attempts
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[SECURITY WARNING] ${timestamp} - ${ip} - ${user} - ${method} ${url} - Status: ${res.statusCode} - ${userAgent}`);
    }
  });
  
  next();
};

/**
 * Password strength validation middleware
 */
const validatePasswordStrength = (req, res, next) => {
  const password = req.body.password || req.body.newPassword;
  
  if (!password) {
    return next();
  }
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Password does not meet security requirements',
      requirements: errors
    });
  }
  
  next();
};

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  securityHeaders,
  validateInput,
  ipWhitelist,
  securityLogger,
  validatePasswordStrength
};
