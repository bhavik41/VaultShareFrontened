/**
 * Security utilities for the VaultShare frontend
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Note: React already escapes content by default, but this provides
 * an additional layer for cases where we might need manual sanitization
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Sanitize filename for display
 * Prevents path traversal and special characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '_') // Replace path separators
    .replace(/\.\./g, '_') // Remove directory traversal
    .replace(/[<>:"|?*]/g, '_') // Remove invalid filename characters
    .trim();
}

/**
 * Validate email format (additional client-side validation)
 * Server-side validation is the primary defense
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate URL to prevent open redirect vulnerabilities
 * Only allow relative URLs or same-origin URLs
 */
export function isValidRedirectUrl(url: string): boolean {
  // Allow relative URLs
  if (url.startsWith('/')) {
    return !url.startsWith('//'); // Prevent protocol-relative URLs
  }
  
  // Check if same origin
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Rate limiting helper for client-side actions
 * Prevents rapid successive requests
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts: number[] = [];
  
  return {
    canProceed(): boolean {
      const now = Date.now();
      
      // Remove old attempts outside the window
      while (attempts.length > 0 && attempts[0] < now - windowMs) {
        attempts.shift();
      }
      
      if (attempts.length >= maxAttempts) {
        return false;
      }
      
      attempts.push(now);
      return true;
    },
    
    getRemainingTime(): number {
      if (attempts.length < maxAttempts) {
        return 0;
      }
      
      const oldestAttempt = attempts[0];
      return Math.max(0, windowMs - (Date.now() - oldestAttempt));
    }
  };
}

/**
 * Secure random string generator for client-side IDs
 * Uses crypto.randomUUID when available, fallback to Math.random
 */
export function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback (less secure but acceptable for non-security-critical IDs)
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Check if running in a secure context (HTTPS)
 * Used to ensure certain features only work over HTTPS
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

/**
 * Validate share link token format
 * Prevents injection attacks through malformed tokens
 */
export function isValidShareToken(token: string): boolean {
  // Share tokens should be alphanumeric and a specific length
  // Adjust regex based on actual token format from backend
  return /^[a-zA-Z0-9_-]{20,64}$/.test(token);
}

/**
 * Safely parse JSON with error handling
 * Prevents crashes from malformed JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if a file download URL is safe
 * Prevents downloading from untrusted sources
 */
export function isSafeDownloadUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedOrigins = [
      window.location.origin,
      import.meta.env.VITE_API_URL,
    ].filter(Boolean);
    
    return allowedOrigins.some(origin => {
      try {
        return urlObj.origin === new URL(origin as string).origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
