'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loading from '@/app/(routes)/dashboard/_components/Loading';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Clear error when email/password changes
  useEffect(() => {
    if (email && password) setError('');
  }, [email, password]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/session', {
        email: email.trim().toLowerCase(),
        password,
      });
      if (!res.data.token) throw new Error('No token received from server');
      localStorage.setItem('token', res.data.token);
      document.cookie = `token=${res.data.token}; path=/; max-age=86400; secure; samesite=strict`;
      localStorage.setItem('userRole', res.data.role);
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Login failed';
      setError(errorMessage);

      // Show toast with actionable message
      if (err.response?.status === 403) {
        toast.error(err.response.data.error || 'Your account is inactive or banned. Contact support.');
      } else if (err.response?.status === 401) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">Login</h2>

        {error && (
          <p className="mb-4 text-center text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email" className="block mb-1 text-gray-700 dark:text-gray-300 font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="relative">
            <Label htmlFor="password" className="block mb-1 text-gray-700 dark:text-gray-300 font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5 inline" /> <Loading message="Please wait, fetching data..." />
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            Back to Home
          </Link>
        </p>
      </div>
      <ToastContainer position="top-center" autoClose={5000} />
    </div>
  );
}
