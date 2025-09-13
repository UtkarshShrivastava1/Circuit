'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
// import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  // Clear error when input changes
  useEffect(() => {
    if ((loginMode === 'password' && email && password) || 
        (loginMode === 'otp' && email)) {
      setError('');
    }
  }, [email, password, otp, loginMode]);

  async function handlePasswordLogin(e) {
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
        toast.error(err.response.data.error || 'Your account is in inactive state,Contact support.');
      } else if (err.response?.status === 401) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOTP(e) {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/otp/generate', {
        email: email.trim().toLowerCase(),
      });
      
      setOtpSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    if (!email || !otp) {
      setError('Email and OTP are required');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/otp/verify', {
        email: email.trim().toLowerCase(),
        otp,
      });
      
      if (!res.data.token) throw new Error('No token received from server');
      localStorage.setItem('token', res.data.token);
      document.cookie = `token=${res.data.token}; path=/; max-age=86400; secure; samesite=strict`;
      localStorage.setItem('userRole', res.data.role);
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed';
      setError(errorMessage);
      toast.error(errorMessage);
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
        
        <Tabs defaultValue="password" className="w-full" onValueChange={setLoginMode}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="otp">OTP Login</TabsTrigger>
          </TabsList>
          
          <TabsContent value="password">
            <form onSubmit={handlePasswordLogin} className="space-y-6">
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
  <input
    id="password"
    type={showPassword ? 'text' : 'password'}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Enter your password"
    required
    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
  />
  {/* <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 z-10"
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
  </button> */}
</div>


          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5 inline" /> Loading...
              </>
            ) : (
              'Login with Password'
            )}
          </Button>
        </form>
        </TabsContent>
        
        <TabsContent value="otp">
          {!otpSent ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <Label htmlFor="email-otp" className="block mb-1 text-gray-700 dark:text-gray-300 font-semibold">
                  Email
                </Label>
                <Input
                  id="email-otp"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
                />
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5 inline" /> Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <Label htmlFor="otp" className="block mb-1 text-gray-700 dark:text-gray-300 font-semibold">
                  Enter OTP sent to your email
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOtpSent(false)}
                  className="px-4 py-2"
                >
                  Back
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestOTP}
                  disabled={loading}
                  className="px-4 py-2"
                >
                  Resend OTP
                </Button>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5 inline" /> Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>
            </form>
          )}
        </TabsContent>
        </Tabs>

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
