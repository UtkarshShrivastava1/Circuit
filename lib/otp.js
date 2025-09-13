// lib/otp.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a random OTP of specified length
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - Generated OTP
 */
export function generateOTP(length = 6) {
  // Generate a random number with specified length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Hash an OTP for secure storage
 * @param {string} otp - The OTP to hash
 * @returns {Promise<string>} - Hashed OTP
 */
export async function hashOTP(otp) {
  return await bcrypt.hash(otp, 10);
}

/**
 * Verify if provided OTP matches the hashed OTP
 * @param {string} providedOTP - The OTP provided by user
 * @param {string} hashedOTP - The hashed OTP from database
 * @returns {Promise<boolean>} - True if OTP matches
 */
export async function verifyOTP(providedOTP, hashedOTP) {
  return await bcrypt.compare(providedOTP, hashedOTP);
}

/**
 * Calculate OTP expiry time
 * @param {number} expiryMinutes - Minutes until OTP expires (default: 10)
 * @returns {Date} - Expiry date
 */
export function calculateOTPExpiry(expiryMinutes = 10) {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);
  return expiryDate;
}

/**
 * Check if OTP is expired
 * @param {Date} expiryDate - OTP expiry date
 * @returns {boolean} - True if OTP is expired
 */
export function isOTPExpired(expiryDate) {
  return new Date() > new Date(expiryDate);
}