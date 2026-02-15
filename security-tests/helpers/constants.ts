/**
 * Shared constants for security tests
 */

export const BASE_URL = 'http://localhost:4321';

export const API_URLS = {
  // Auth
  AUTH_SESSION: `${BASE_URL}/api/auth/session`,
  AUTH_LOGOUT: `${BASE_URL}/api/auth/logout`,

  // Orders
  SAVE_ORDER: `${BASE_URL}/api/save-order`,
  GET_ORDER: `${BASE_URL}/api/get-order`,
  CANCEL_ORDER: `${BASE_URL}/api/cancel-order`,
  FINALIZE_ORDER: `${BASE_URL}/api/finalize-order`,

  // Payments
  CREATE_PAYMENT_INTENT: `${BASE_URL}/api/create-payment-intent`,
  STRIPE_WEBHOOK: `${BASE_URL}/api/stripe-webhook`,

  // Coupons
  VALIDATE_COUPON: `${BASE_URL}/api/validate-coupon`,

  // Wallet
  GET_WALLET_BALANCE: `${BASE_URL}/api/get-wallet-balance`,
  GET_WALLET_TRANSACTIONS: `${BASE_URL}/api/get-wallet-transactions`,

  // Admin
  SET_ADMIN_CLAIM: `${BASE_URL}/api/admin/set-admin-claim`,
  SET_ADMIN_CLAIMS: `${BASE_URL}/api/admin/set-admin-claims`,
  ADMIN_GET_ORDER: `${BASE_URL}/api/admin/get-order`,
  ADMIN_UPDATE_ORDER_STATUS: `${BASE_URL}/api/admin/update-order-status`,
  ADMIN_UPDATE_ITEM_STATUS: `${BASE_URL}/api/admin/update-item-status`,
  ADMIN_UPDATE_ITEM_NOTES: `${BASE_URL}/api/admin/update-item-notes`,
  ADMIN_CLIPARTS_CREATE: `${BASE_URL}/api/admin/cliparts/create`,
  ADMIN_TEMPLATES_CREATE: `${BASE_URL}/api/admin/templates/create`,
  ADMIN_DIGITAL_CREATE: `${BASE_URL}/api/admin/digital/create-product`,

  // Designs
  DESIGNS_SAVE: `${BASE_URL}/api/designs/save`,
  DESIGNS_GET: `${BASE_URL}/api/designs/get-user-designs`,
  DESIGNS_DELETE: `${BASE_URL}/api/designs/delete`,
  DESIGNS_DUPLICATE: `${BASE_URL}/api/designs/duplicate`,
  DESIGNS_TOGGLE_FAVORITE: `${BASE_URL}/api/designs/toggle-favorite`,

  // Digital
  DIGITAL_CREATE: `${BASE_URL}/api/digital/create-product`,
  DIGITAL_DOWNLOADS: `${BASE_URL}/api/digital/get-my-downloads`,
  DIGITAL_DOWNLOAD_FILE: `${BASE_URL}/api/digital/download-file`,

  // Storage
  GET_SIGNED_URL: `${BASE_URL}/api/storage/get-signed-url`,

  // Share
  SHARE_CREATE: `${BASE_URL}/api/share/create`,
  SHARE_TRACK: `${BASE_URL}/api/share/track-share`,

  // Email
  SEND_EMAIL: `${BASE_URL}/api/send-email`,
  SEND_CAMPAIGN: `${BASE_URL}/api/send-campaign`,
  SUBSCRIBE_NEWSLETTER: `${BASE_URL}/api/subscribe-newsletter`,

  // Addresses
  ADDRESSES: `${BASE_URL}/api/addresses`,

  // Cron
  CRON_CLEANUP: `${BASE_URL}/api/cron/cleanup-reservations`,
} as const;

/**
 * Malicious payloads for input validation testing
 */
export const ATTACK_PAYLOADS = {
  xss: [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>alert(document.cookie)</script>',
    "javascript:alert('XSS')",
    '<svg onload=alert(1)>',
    '<body onload=alert(1)>',
    '${alert(1)}',
    '{{constructor.constructor("return this")()}}',
  ],
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "' UNION SELECT * FROM users--",
    "1' AND '1'='1",
    "admin'--",
  ],
  nosqlInjection: [
    '{"$gt":""}',
    '{"$ne":""}',
    '{"$regex":".*"}',
    '{"$where":"1==1"}',
    '{"__proto__":{"isAdmin":true}}',
  ],
  pathTraversal: [
    '../../etc/passwd',
    '..%2f..%2fetc%2fpasswd',
    '....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f',
    '../../../.env',
  ],
  longStrings: ['A'.repeat(100000), 'B'.repeat(50000)],
  unicode: [
    '\u0000\u0001\u0002',
    '\uFFFD'.repeat(1000),
    '\u200B'.repeat(500), // zero-width space
    '\uD800', // lone surrogate
  ],
  protoPolluton: [
    '{"__proto__":{"isAdmin":true}}',
    '{"constructor":{"prototype":{"isAdmin":true}}}',
  ],
} as const;

/**
 * Standard error patterns that should NEVER appear in production responses
 */
export const FORBIDDEN_ERROR_PATTERNS = [
  /at\s+\w+\s+\(/i, // stack traces
  /node_modules/i,
  /\/home\//i,
  /\/usr\//i,
  /Error:\s+/,
  /FIREBASE_/,
  /STRIPE_SECRET/,
  /sk_live_/,
  /sk_test_/,
  /\.env/,
  /firebase-admin/,
  /firestore/i,
] as const;
