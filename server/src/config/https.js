const fs = require('fs');
const path = require('path');

/**
 * HTTPS Configuration for Production
 * This module provides SSL/TLS certificate configuration for secure connections
 */

const httpsConfig = {
  /**
   * Get SSL options for HTTPS server
   * @returns {Object|null} SSL options or null if certificates not available
   */
  getSSLOptions() {
    try {
      // Check if we're in production and certificates are available
      if (process.env.NODE_ENV !== 'production') {
        console.log('ℹ️  HTTPS: Running in development mode, skipping SSL configuration');
        return null;
      }

      // Certificate paths (configure these based on your certificate provider)
      const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../../certificates');
      const keyFile = process.env.SSL_KEY_FILE || 'private.key';
      const certFile = process.env.SSL_CERT_FILE || 'certificate.crt';
      const caFile = process.env.SSL_CA_FILE || 'ca_bundle.crt';

      const keyPath = path.join(certPath, keyFile);
      const certFilePath = path.join(certPath, certFile);
      const caPath = path.join(certPath, caFile);

      // Check if certificate files exist
      if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
        console.warn('⚠️  HTTPS: SSL certificates not found at expected paths');
        console.warn(`    Key: ${keyPath}`);
        console.warn(`    Cert: ${certFilePath}`);
        console.warn('    Falling back to HTTP mode');
        return null;
      }

      // Read certificate files
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certFilePath)
      };

      // Add CA bundle if available (for intermediate certificates)
      if (fs.existsSync(caPath)) {
        options.ca = fs.readFileSync(caPath);
      }

      console.log('✅ HTTPS: SSL certificates loaded successfully');
      return options;

    } catch (error) {
      console.error('❌ HTTPS: Error loading SSL certificates:', error.message);
      return null;
    }
  },

  /**
   * Get recommended security headers for HTTPS
   * @returns {Object} Security headers configuration
   */
  getSecurityHeaders() {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';"
    };
  },

  /**
   * Middleware to enforce HTTPS in production
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  enforceHTTPS(req, res, next) {
    // Only enforce HTTPS in production
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Check if request is already secure
    if (req.secure || req.get('x-forwarded-proto') === 'https') {
      return next();
    }

    // Redirect HTTP to HTTPS
    const httpsUrl = `https://${req.get('host')}${req.url}`;
    console.log(`🔒 HTTPS: Redirecting HTTP request to HTTPS: ${httpsUrl}`);
    return res.redirect(301, httpsUrl);
  },

  /**
   * Middleware to add security headers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  addSecurityHeaders(req, res, next) {
    const headers = this.getSecurityHeaders();
    
    // Add security headers to response
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  },

  /**
   * Get environment-specific configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      // Port configuration
      httpPort: process.env.HTTP_PORT || 3001,
      httpsPort: process.env.HTTPS_PORT || 3443,
      
      // Certificate configuration
      certPath: process.env.SSL_CERT_PATH || path.join(__dirname, '../../certificates'),
      keyFile: process.env.SSL_KEY_FILE || 'private.key',
      certFile: process.env.SSL_CERT_FILE || 'certificate.crt',
      caFile: process.env.SSL_CA_FILE || 'ca_bundle.crt',
      
      // Security settings
      enforceHTTPS: process.env.ENFORCE_HTTPS === 'true',
      hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000, // 1 year
      
      // Development settings
      allowSelfSigned: process.env.ALLOW_SELF_SIGNED === 'true',
      
      // Production domain
      domain: process.env.DOMAIN || 'localhost'
    };
  }
};

module.exports = httpsConfig;
