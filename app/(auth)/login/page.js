'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Clear error when email/password change
  useEffect(() => {
    if (email && password) {
      setError('');
    }
  }, [email, password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/session', { email, password });
      if (!res.data.token) {
        throw new Error('No token received from server');
      }

      // Store token in localStorage
      localStorage.setItem('token', res.data.token);
      // Set auth cookie with secure attributes
      document.cookie = `token=${res.data.token}; path=/; max-age=86400; secure; samesite=strict`;
      // Store user role (optional, for permission checks)
      localStorage.setItem('userRole', res.data.role);
      // Redirect to dashboard
      router.push('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      // Parse API error or use fallback
      setError(err.response?.data?.error || err.message || "Invalid credentials or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Login
        </h2>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <Label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-6 relative">
            <Label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <AiOutlineEyeInvisible size={24} /> : <AiOutlineEye size={24} />}
            </button>
          </div>

          <Button
            type="submit"
            className={`w-full py-3 mt-2 font-semibold transition-colors ${
              loading ? 'bg-gray-400 cursor-not-allowed' : ''
            }`}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Back to{' '}
          <Link href="/" className="text-blue-500 hover:underline">
            Home
          </Link>
        </p>
      </div>
      <ToastContainer />
    </div>
  );
}
