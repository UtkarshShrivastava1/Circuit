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
    const verified = jwt.verify(token, JWT_SECRET);
    return verified;
  } catch (err) {
    console.error('Token verification failed:', err);
    throw new Error('Your token has expired or is invalid');
  }
}

// Generate access token with improved error handling
export function signToken(payload) {
  if (!payload) {
    console.error('No payload provided for token generation');
    return null;
  }

  try {
    // Ensure required fields are present
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

    // Verify token was generated successfully
    const verified = jwt.verify(token, JWT_SECRET);
    if (!verified) {
      throw new Error('Token verification failed after generation');
    }

    console.log('Token generated successfully for:', payload.email);
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    return null;
  }
}

// Verify access token with detailed error handling
export function verifyToken(token) {
  if (!token) {
    console.error('No token provided for verification');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}