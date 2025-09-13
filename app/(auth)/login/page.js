'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, User, Lock, Eye, EyeOff, Shield, Zap, Users, BarChart3 } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

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

      if (err.response?.status === 403) {
        toast.error(err.response.data.error || 'Your account is in inactive state, Contact support.');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 flex relative overflow-hidden">
      {/* Left Side - Image Display (Keep as is since you like it) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background with smooth curved edge */}
        <div className="absolute inset-0 bg-white dark:bg-slate-950">
          <svg
            viewBox="0 0 800 800"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id="leftBgGradient" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="40%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </radialGradient>
            </defs>
            <path
              d="M0,0 L700,0 Q750,200 700,400 Q750,600 700,800 L0,800 Z"
              fill="url(#leftBgGradient)"
              className="dark:fill-slate-950"
            />
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          {/* Brand Section */}
          <div className="text-center mb-16">
            <h1 
              style={{ 
                fontFamily: 'Big Shoulders Stencil, cursive',
                fontSize: '8rem',
                lineHeight: '1',
                textShadow: '4px 4px 8px rgba(0,0,0,0.3)',
                letterSpacing: '0.05em'
              }} 
              className="font-black text-gray-900 dark:text-white mb-6 transform hover:scale-105 transition-transform duration-300"
            >
              CIRCUIT 
            </h1>
            <p className="text-2xl ml-2 text-gray-600 dark:text-slate-400 font-medium">Streamline your productivity</p>
          </div>

          {/* Curved Image Container */}
          <div className="relative">
            <div 
              className="w-80 h-80 overflow-hidden shadow-2xl border-4 border-gray-200 dark:border-slate-600"
              style={{
                borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                transform: 'rotate(-10deg)'
              }}
            >
              <Image
                src="/09abcca0eea3e28c1911e04aa9bb4632.jpg"
                alt="Productivity workspace illustration"
                width={320}
                height={320}
                className="w-full h-full object-cover"
                style={{
                  transform: 'rotate(10deg) scale(1.1)',
                  transformOrigin: 'center'
                }}
                priority
              />
            </div>
            
            {/* Floating decorative elements */}
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-blue-500 dark:bg-blue-600 rounded-full opacity-80 animate-float"></div>
            <div className="absolute -bottom-6 -left-6 w-8 h-8 bg-green-500 dark:bg-green-600 rounded-full opacity-70 animate-float-delayed"></div>
            <div className="absolute top-1/3 -left-10 w-6 h-6 bg-slate-500 dark:bg-slate-600 rounded-full opacity-60 animate-float"></div>
            <div className="absolute bottom-1/3 -right-8 w-10 h-10 bg-orange-500 dark:bg-orange-600 rounded-full opacity-50 animate-float-delayed"></div>
          </div>

          {/* Bottom Description */}
          <div className="text-center mt-12 max-w-md">
            <p className="text-lg text-gray-600 dark:text-slate-400 leading-relaxed">
              Manage your tasks efficiently and boost your productivity with our comprehensive workflow system
            </p>
          </div>
        </div>
      </div>

      {/* Elegant Curved Divider */}
      <div className="hidden lg:block absolute inset-y-0 left-1/2 transform -translate-x-1/2 z-20">
        <svg
          width="120"
          height="100%"
          viewBox="0 0 120 800"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="dividerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#64748b" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Multiple curved paths for depth */}
          <path
            d="M60,0 Q30,150 60,300 Q90,450 60,600 Q30,750 60,800"
            stroke="url(#dividerGradient)"
            strokeWidth="3"
            fill="none"
            filter="url(#glow)"
            className="animate-pulse"
          />
          
          <path
            d="M45,0 Q20,200 50,400 Q80,600 45,800"
            stroke="#3b82f6"
            strokeWidth="1"
            fill="none"
            opacity="0.6"
            className="animate-pulse"
          />
          
          <path
            d="M75,0 Q100,200 70,400 Q40,600 75,800"
            stroke="#64748b"
            strokeWidth="1"
            fill="none"
            opacity="0.6"
            className="animate-pulse"
          />
          
          {/* Animated floating elements along curves */}
          <circle cx="60" cy="100" r="4" fill="#3b82f6" className="opacity-80 animate-bounce">
            <animate attributeName="cy" values="100;120;100" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="45" cy="250" r="3" fill="#64748b" className="opacity-70 animate-pulse">
            <animate attributeName="cy" values="250;270;250" dur="4s" repeatCount="indefinite"/>
          </circle>
          <circle cx="75" cy="400" r="3.5" fill="#06b6d4" className="opacity-80 animate-bounce">
            <animate attributeName="cy" values="400;420;400" dur="3.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="50" cy="550" r="3" fill="#10b981" className="opacity-70 animate-pulse">
            <animate attributeName="cy" values="550;570;550" dur="4.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="70" cy="700" r="4" fill="#f59e0b" className="opacity-80 animate-bounce">
            <animate attributeName="cy" values="700;720;700" dur="3.2s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>

      {/* Right Side - Matching Background with Elegant Colors */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Matching Background to Left Side */}
        <div className="absolute inset-0 bg-white dark:bg-slate-950">
          <svg
            viewBox="0 0 800 800"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id="rightBgGradient" cx="70%" cy="30%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="40%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </radialGradient>
            </defs>
            <path
              d="M100,0 Q50,200 100,400 Q50,600 100,800 L800,800 L800,0 Z"
              fill="url(#rightBgGradient)"
              className="dark:fill-slate-950"
            />
          </svg>
          
          {/* Subtle organic shapes background */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 600">
            <defs>
              <radialGradient id="rightGrad1" cx="80%" cy="20%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="rightGrad2" cx="20%" cy="80%">
                <stop offset="0%" stopColor="#64748b" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="rightGrad3" cx="70%" cy="70%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
            </defs>
            
            <circle cx="640" cy="120" r="150" fill="url(#rightGrad1)" className="animate-pulse" />
            <circle cx="160" cy="480" r="200" fill="url(#rightGrad2)" className="animate-pulse" />
            <circle cx="560" cy="420" r="120" fill="url(#rightGrad3)" className="animate-pulse" />
          </svg>
        </div>

        {/* Elegant Floating Elements */}
        <div className="absolute top-16 right-20 w-20 h-20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl rotate-12 animate-float opacity-40"></div>
        <div className="absolute bottom-24 left-16 w-16 h-16 border-2 border-slate-200 dark:border-slate-800 rounded-full animate-float-delayed opacity-50"></div>
        <div className="absolute top-1/3 right-12 w-12 h-12 border-2 border-cyan-200 dark:border-cyan-800 rounded-lg rotate-45 animate-float opacity-30"></div>
        <div className="absolute bottom-1/2 left-8 w-24 h-24 border-2 border-green-200 dark:border-green-800 rounded-3xl animate-float-delayed opacity-40"></div>

        {/* Elegant Feature Icons */}
        <div className="absolute top-20 right-24 bg-blue-500/10 dark:bg-blue-400/20 backdrop-blur-sm rounded-2xl p-4 animate-float">
          <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="absolute top-1/2 right-8 bg-slate-500/10 dark:bg-slate-400/20 backdrop-blur-sm rounded-2xl p-4 animate-float-delayed">
          <Zap className="w-8 h-8 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="absolute bottom-32 left-12 bg-cyan-500/10 dark:bg-cyan-400/20 backdrop-blur-sm rounded-2xl p-4 animate-float">
          <Users className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="absolute top-1/3 left-4 bg-green-500/10 dark:bg-green-400/20 backdrop-blur-sm rounded-2xl p-4 animate-float-delayed">
          <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <div className="w-full max-w-md relative z-20">
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center mb-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200/50 dark:border-slate-700/50">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Big Shoulders Stencil, cursive' }}>CIRCUIT</h1>
            <p className="text-gray-600 dark:text-slate-400 text-xl">Streamline your productivity</p>
          </div>

          {/* Elegant Login Form Card */}
          <div className="relative">
            {/* Subtle glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-slate-500/10 to-cyan-500/10 rounded-3xl blur-xl"></div>
            
            <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 rounded-3xl p-12 overflow-hidden">
              {/* Subtle background elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-100/20 to-transparent dark:from-blue-900/10 rounded-bl-full"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-slate-100/20 to-transparent dark:from-slate-900/10 rounded-tr-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-radial from-cyan-100/5 to-transparent dark:from-cyan-900/5 rounded-full"></div>
              
              <div className="relative z-10">
                {/* Form Header with elegant styling */}
                <div className="text-center mb-12">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg">
                      <Lock className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-lg -z-10"></div>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Welcome Back</h2>
                  <p className="text-gray-600 dark:text-slate-400 text-xl">Access your productivity hub</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-8 p-5 bg-red-50/90 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl backdrop-blur-sm">
                    <p className="text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
                  </div>
                )}

                {/* Elegant Login Form */}
                <form onSubmit={handleLogin} className="space-y-8">
                  {/* Email Field */}
                  <div>
                    <Label htmlFor="email" className="block mb-4 text-gray-700 dark:text-gray-300 font-bold text-xl">
                      Email Address
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-6 w-6 group-focus-within:text-blue-500 transition-colors duration-300" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                        className="w-full pl-14 pr-6 py-5 border-2 border-gray-300 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-slate-900/70 placeholder-gray-500 dark:placeholder-slate-400 transition-all duration-300 text-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <Label htmlFor="password" className="block mb-4 text-gray-700 dark:text-gray-300 font-bold text-xl">
                      Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-6 w-6 group-focus-within:text-blue-500 transition-colors duration-300" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-14 pr-16 py-5 border-2 border-gray-300 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-gray-100 bg-gray-50/70 dark:bg-slate-900/70 placeholder-gray-500 dark:placeholder-slate-400 transition-all duration-300 text-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                      </button>
                    </div>
                  </div>

                  {/* Elegant Submit Button - Better Colors */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl text-xl transform hover:scale-105 active:scale-95 hover:shadow-blue-500/25 focus:ring-4 focus:ring-blue-500/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-3 h-7 w-7 inline" /> 
                        Signing in...
                      </>
                    ) : (
                      'Access Dashboard'
                    )}
                  </Button>
                </form>

                {/* Footer with elegant divider */}
                <div className="mt-10 space-y-6">
          <div className="text-center mt-10">
            <Link href="/" className="text-blue-600 hover:text-cyan-600 dark:text-blue-400 dark:hover:text-cyan-400 font-bold transition-colors duration-300 text-xl inline-flex items-center space-x-3 hover:underline underline-offset-4 decoration-2">
              <span>←</span>
              <span>Return Home</span>
            </Link>
          </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Back to Home */}

        </div>
      </div>

      <ToastContainer 
        position="top-right" 
        autoClose={5000}
        theme="auto"
        className="dark:bg-slate-800"
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-180deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
