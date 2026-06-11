/**
 * DOMException Polyfill for React Native
 * 
 * React Native doesn't have the browser's DOMException global.
 * This polyfill provides a minimal implementation for compatibility.
 */

// Polyfill DOMException
if (typeof global.DOMException === 'undefined') {
  class DOMException extends Error {
    public code: number;
    public readonly ABORT_ERR: number = 20;
    public readonly DATA_CLONE_ERR: number = 25;
    public readonly DOMSTRING_SIZE_ERR: number = 2;
    public readonly HIERARCHY_REQUEST_ERR: number = 3;
    public readonly INDEX_SIZE_ERR: number = 1;
    public readonly INUSE_ATTRIBUTE_ERR: number = 10;
    public readonly INVALID_ACCESS_ERR: number = 15;
    public readonly INVALID_CHARACTER_ERR: number = 5;
    public readonly INVALID_MODIFICATION_ERR: number = 13;
    public readonly INVALID_NODE_TYPE_ERR: number = 24;
    public readonly INVALID_STATE_ERR: number = 11;
    public readonly NAMESPACE_ERR: number = 14;
    public readonly NETWORK_ERR: number = 19;
    public readonly NOT_FOUND_ERR: number = 8;
    public readonly NOT_SUPPORTED_ERR: number = 9;
    public readonly NO_DATA_ALLOWED_ERR: number = 6;
    public readonly NO_MODIFICATION_ALLOWED_ERR: number = 7;
    public readonly QUOTA_EXCEEDED_ERR: number = 22;
    public readonly SECURITY_ERR: number = 18;
    public readonly SYNTAX_ERR: number = 12;
    public readonly TIMEOUT_ERR: number = 23;
    public readonly TYPE_MISMATCH_ERR: number = 17;
    public readonly URL_MISMATCH_ERR: number = 21;
    public readonly VALIDATION_ERR: number = 16;
    public readonly WRONG_DOCUMENT_ERR: number = 4;

    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'Error';
      this.code = 0;

      // Set the code based on the name
      switch (this.name) {
        case 'AbortError':
          this.code = this.ABORT_ERR;
          break;
        case 'DataCloneError':
          this.code = this.DATA_CLONE_ERR;
          break;
        case 'NetworkError':
          this.code = this.NETWORK_ERR;
          break;
        case 'NotFoundError':
          this.code = this.NOT_FOUND_ERR;
          break;
        case 'NotSupportedError':
          this.code = this.NOT_SUPPORTED_ERR;
          break;
        case 'QuotaExceededError':
          this.code = this.QUOTA_EXCEEDED_ERR;
          break;
        case 'SecurityError':
          this.code = this.SECURITY_ERR;
          break;
        case 'SyntaxError':
          this.code = this.SYNTAX_ERR;
          break;
        case 'TimeoutError':
          this.code = this.TIMEOUT_ERR;
          break;
        default:
          this.code = 0;
      }

      // Maintains proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DOMException);
      }
    }
  }

  // Add to global scope
  (global as any).DOMException = DOMException;
  
  // Also add to window if it exists (for web compatibility)
  if (typeof window !== 'undefined') {
    (window as any).DOMException = DOMException;
  }
}

// Polyfill AbortController if needed (React Native should have this, but just in case)
if (typeof global.AbortController === 'undefined' && typeof AbortController !== 'undefined') {
  (global as any).AbortController = AbortController;
}

// Polyfill AbortSignal if needed
if (typeof global.AbortSignal === 'undefined' && typeof AbortSignal !== 'undefined') {
  (global as any).AbortSignal = AbortSignal;
}

export {};
