import jwt from 'jsonwebtoken';

// Use a secure secret stored in your .env.local as JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies a JWT token string using your secret.
 * @param {string} token - The JWT token (from cookie/header)
 * @returns {object|null} - Payload if valid, null if not.
 */
export function verifyToken(token) {
  try {
    // Throws if invalid or expired
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // e.g., { userId, email, role, ... }
  } catch (error) {
    return null; // Invalid or expired token
  }
}
