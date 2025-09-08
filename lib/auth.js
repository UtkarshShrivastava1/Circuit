import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in .env file");
}

export async function verifyAuth(token) {
  if (!token) {
    throw new Error('No token provided');
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Token verification failed:', err);
    throw new Error('Your token has expired or is invalid');
  }
}

// Simplify: `verifyToken` can be synchronous
export function verifyToken(token) {
  if (!token) {
    console.error('No token provided for verification');
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

// signToken with improved validation and logs
export function signToken(payload) {
  if (!payload) {
    console.error('No payload provided for token generation');
    return null;
  }
  try {
    const requiredFields = ['id', 'email', 'role'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        console.error(`Missing required field: ${field}`);
        return null;
      }
    }
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1d',
      algorithm: 'HS256'
    });
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    return null;
  }
}
