import { cookies } from 'next/headers';
import { encrypt, decrypt } from './crypto'; // We'll create this next

const SESSION_COOKIE = 'user_session';
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set in environment variables');
}

// Set session data
export async function setSession(data) {
  try {
    // Encrypt the session data
    const encrypted = await encrypt(JSON.stringify(data), SESSION_SECRET);
    
    // Set the session cookie
    cookies().set(SESSION_COOKIE, encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return true;
  } catch (error) {
    console.error('Error setting session:', error);
    return false;
  }
}

// Get session data
export async function getSession() {
  try {
    const sessionCookie = cookies().get(SESSION_COOKIE);
    
    if (!sessionCookie?.value) {
      return null;
    }

    // Decrypt the session data
    const decrypted = await decrypt(sessionCookie.value, SESSION_SECRET);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Delete session
export async function deleteSession() {
  try {
    cookies().delete(SESSION_COOKIE);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}