/**
 * DOMException Polyfill for React Native / Hermes
 * 
 * CRITICAL: This file runs as a Metro bundle polyfill, BEFORE React Native
 * initialization and BEFORE any module evaluation. It must be plain JS
 * with no imports, no TypeScript, and no ES module syntax.
 * 
 * Why this exists:
 * - React Native 0.81.x's setUpDOM.js registers DOMRect, Node, Element, etc.
 *   as globals but does NOT register DOMException.
 * - Several libraries (whatwg-fetch, undici, etc.) reference DOMException as
 *   a bare global during module evaluation.
 * - Hermes throws ReferenceError for undefined globals (unlike V8 which
 *   returns undefined for property access on globalThis).
 * - A polyfill in the app entry point (index.ts) runs AFTER RN initialization,
 *   which is too late - the error already occurred during setUpDefaultReactNativeEnvironment.
 */

(function () {
  'use strict';

  // Check all possible global objects
  var g =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof global !== 'undefined' && global) ||
    (typeof self !== 'undefined' && self) ||
    (typeof window !== 'undefined' && window) ||
    {};

  // If DOMException already exists, don't override
  if (typeof g.DOMException !== 'undefined') {
    return;
  }

  // Error name to error code mapping (from the WebIDL spec)
  var ERROR_NAME_TO_CODE = {
    IndexSizeError: 1,
    HierarchyRequestError: 3,
    WrongDocumentError: 4,
    InvalidCharacterError: 5,
    NoModificationAllowedError: 7,
    NotFoundError: 8,
    NotSupportedError: 9,
    InUseAttributeError: 10,
    InvalidStateError: 11,
    SyntaxError: 12,
    InvalidModificationError: 13,
    NamespaceError: 14,
    InvalidAccessError: 15,
    TypeMismatchError: 17,
    SecurityError: 18,
    NetworkError: 19,
    AbortError: 20,
    URLMismatchError: 21,
    QuotaExceededError: 22,
    TimeoutError: 23,
    InvalidNodeTypeError: 24,
    DataCloneError: 25,
  };

  // Static error code constants
  var ERROR_CODES = {
    INDEX_SIZE_ERR: 1,
    DOMSTRING_SIZE_ERR: 2,
    HIERARCHY_REQUEST_ERR: 3,
    WRONG_DOCUMENT_ERR: 4,
    INVALID_CHARACTER_ERR: 5,
    NO_DATA_ALLOWED_ERR: 6,
    NO_MODIFICATION_ALLOWED_ERR: 7,
    NOT_FOUND_ERR: 8,
    NOT_SUPPORTED_ERR: 9,
    INUSE_ATTRIBUTE_ERR: 10,
    INVALID_STATE_ERR: 11,
    SYNTAX_ERR: 12,
    INVALID_MODIFICATION_ERR: 13,
    NAMESPACE_ERR: 14,
    INVALID_ACCESS_ERR: 15,
    VALIDATION_ERR: 16,
    TYPE_MISMATCH_ERR: 17,
    SECURITY_ERR: 18,
    NETWORK_ERR: 19,
    ABORT_ERR: 20,
    URL_MISMATCH_ERR: 21,
    QUOTA_EXCEEDED_ERR: 22,
    TIMEOUT_ERR: 23,
    INVALID_NODE_TYPE_ERR: 24,
    DATA_CLONE_ERR: 25,
  };

  /**
   * DOMException constructor polyfill
   * @param {string} [message] - Error message
   * @param {string} [name] - Error name (e.g., 'AbortError', 'NetworkError')
   */
  function DOMException(message, name) {
    // Create underlying Error for stack trace
    var err = new Error(message || '');

    this.message = message || '';
    this.name = name || 'Error';
    this.code = ERROR_NAME_TO_CODE[this.name] || 0;

    // Copy stack trace from the Error
    if (err.stack) {
      this.stack = err.stack;
    }
  }

  // Set up prototype chain
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;

  // Add static and instance constants
  var code;
  for (code in ERROR_CODES) {
    if (ERROR_CODES.hasOwnProperty(code)) {
      Object.defineProperty(DOMException, code, {
        value: ERROR_CODES[code],
        enumerable: true,
        configurable: false,
        writable: false,
      });
      Object.defineProperty(DOMException.prototype, code, {
        value: ERROR_CODES[code],
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
  }

  // Register on ALL global objects to ensure availability everywhere
  g.DOMException = DOMException;

  if (typeof globalThis !== 'undefined' && !globalThis.DOMException) {
    globalThis.DOMException = DOMException;
  }
  if (typeof global !== 'undefined' && !global.DOMException) {
    global.DOMException = DOMException;
  }
  if (typeof self !== 'undefined' && !self.DOMException) {
    self.DOMException = DOMException;
  }
  if (typeof window !== 'undefined' && !window.DOMException) {
    window.DOMException = DOMException;
  }
})();
