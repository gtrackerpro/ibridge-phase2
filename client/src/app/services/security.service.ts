import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  constructor(private sanitizer: DomSanitizer) { }

  /**
   * Sanitize HTML content to prevent XSS attacks
   * @param html Raw HTML content
   * @returns Sanitized HTML
   */
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(1, html) || '';
  }

  /**
   * Validate input against malicious patterns
   * @param input Input string to validate
   * @returns True if input is safe, false otherwise
   */
  validateInput(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return true;
    }

    // XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<[^>]*>/g
    ];

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /('|(\\')|(;)|(\\)|(--)|(\s))/i
    ];

    // Check for malicious patterns
    const hasMaliciousPattern = [...xssPatterns, ...sqlPatterns].some(pattern => 
      pattern.test(input)
    );

    return !hasMaliciousPattern;
  }

  /**
   * Sanitize user input for safe display
   * @param input Raw user input
   * @returns Sanitized input
   */
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    // Remove potential XSS patterns
    let sanitized = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();

    // Escape HTML entities
    const div = document.createElement('div');
    div.textContent = sanitized;
    return div.innerHTML;
  }

  /**
   * Validate password strength
   * @param password Password to validate
   * @returns Validation result with errors
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Generate Content Security Policy meta tag
   * @returns CSP meta tag content
   */
  generateCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' http://localhost:3001 https://your-api-domain.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Set security headers for the application
   */
  setSecurityHeaders(): void {
    // Only add CSP meta tag in development (server handles security headers in production)
    if (this.isDevelopment()) {
      // Add CSP meta tag
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = this.generateCSP();
      document.head.appendChild(cspMeta);

      // Add Referrer Policy
      const referrerPolicyMeta = document.createElement('meta');
      referrerPolicyMeta.name = 'referrer';
      referrerPolicyMeta.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(referrerPolicyMeta);
    }
  }

  /**
   * Check if running in development mode
   */
  private isDevelopment(): boolean {
    return !window.location.hostname.includes('production') && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1');
  }

  /**
   * Detect potential security threats in user behavior
   * @param event User interaction event
   * @returns Security threat assessment
   */
  detectSecurityThreat(event: any): { threat: boolean; type: string } {
    // Check for rapid-fire requests (potential bot behavior)
    const now = Date.now();
    const lastRequest = localStorage.getItem('lastRequest');
    
    if (lastRequest && (now - parseInt(lastRequest)) < 100) {
      return { threat: true, type: 'rapid_requests' };
    }
    
    localStorage.setItem('lastRequest', now.toString());

    // Check for suspicious patterns in input
    if (event.target && event.target.value) {
      const input = event.target.value;
      if (!this.validateInput(input)) {
        return { threat: true, type: 'malicious_input' };
      }
    }

    return { threat: false, type: '' };
  }

  /**
   * Secure local storage operations
   * @param key Storage key
   * @param value Value to store
   * @param encrypt Whether to encrypt the value
   */
  secureStore(key: string, value: any, encrypt: boolean = false): void {
    try {
      let valueToStore = JSON.stringify(value);
      
      if (encrypt) {
        // Simple encryption for demo - use proper encryption in production
        valueToStore = btoa(valueToStore);
      }
      
      localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('Secure storage failed:', error);
    }
  }

  /**
   * Secure local storage retrieval
   * @param key Storage key
   * @param decrypt Whether to decrypt the value
   * @returns Retrieved value
   */
  secureRetrieve(key: string, decrypt: boolean = false): any {
    try {
      let value = localStorage.getItem(key);
      
      if (!value) {
        return null;
      }
      
      if (decrypt) {
        value = atob(value);
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.error('Secure retrieval failed:', error);
      return null;
    }
  }

  /**
   * Clear sensitive data from browser
   */
  clearSensitiveData(): void {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastRequest');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies (if any)
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  }

  /**
   * Log security events
   * @param event Security event type
   * @param details Event details
   */
  logSecurityEvent(event: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to security monitoring service
    console.warn('[SECURITY EVENT]', logEntry);
    
    // Store locally for debugging
    const securityLogs = this.secureRetrieve('securityLogs') || [];
    securityLogs.push(logEntry);
    
    // Keep only last 100 events
    if (securityLogs.length > 100) {
      securityLogs.shift();
    }
    
    this.secureStore('securityLogs', securityLogs);
  }
}

/**
 * HTTP Security Interceptor
 * Adds security headers to all HTTP requests
 */
@Injectable()
export class SecurityInterceptor implements HttpInterceptor {
  
  constructor(private securityService: SecurityService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add minimal security headers (only X-Requested-With)
    const secureReq = req.clone({
      setHeaders: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    // Log API requests for security monitoring
    this.securityService.logSecurityEvent('api_request', {
      method: req.method,
      url: req.url,
      headers: req.headers.keys()
    });

    return next.handle(secureReq);
  }
}
