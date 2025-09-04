'use client';
import React from 'react';
import Link from 'next/link';

const Hero = () => {
  const features = [
    {
      title: "Project Management",
      description: "Efficiently plan, execute, and monitor your projects.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-blue-500">
          <path fillRule="evenodd" d="M9 6.75A.75.75 0 0110.5 6h10.5a.75.75 0 010 1.5H10.5A.75.75 0 019 6.75zm6 4.5a.75.75 0 01-.75.75h-8.5a.75.75 0 010-1.5h8.5a.75.75 0 01.75.75zm-1.5 8a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0v4z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M5.25 10.5a2.25 2.25 0 112.25-2.25 2.25 2.25 0 01-2.25 2.25zm2.25-1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
        </svg>
      ),
      url: "/dashboard"
    },
    {
      title: "Task Tracking",
      description: "Stay on top of your tasks and meet your deadlines.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-green-500">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H12v1h4a1 1 0 110 2H8a1 1 0 010-2h4v-1H4a1 1 0 01-1-1V5zm3 2a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      ),
      url: "/dashboard"
    },
    {
      title: "Team Collaboration",
      description: "Seamlessly collaborate with your team members.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-purple-500">
          <path fillRule="evenodd" d="M12 2.5c-2.86 0-5.5 1.67-5.5 4.5S9.14 11.5 12 11.5s5.5-1.67 5.5-4.5S14.86 2.5 12 2.5zm-1.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm4.5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 12.5c-1.93 0-3.5.52-3.5 1.5s1.57 1.5 3.5 1.5 3.5-.52 3.5-1.5-1.57-1.5-3.5-1.5z" clipRule="evenodd" />
        </svg>
      ),
      url: "/dashboard"
    },
    {
      title: "Time Management",
      description: "Optimize your time and boost productivity.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-yellow-500">
          <path fillRule="evenodd" d="M12 2.25c-5.384 0-9.75 4.366-9.75 9.75s4.366 9.75 9.75 9.75 9.75-4.366 9.75-9.75S17.384 2.25 12 2.25zm0 18c-4.7 0-8.5-3.8-8.5-8.5S7.3 3 12 3s8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5zM12 7.5a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V8.25A.75.75 0 0112 7.5z" clipRule="evenodd" />
        </svg>
      ),
      url: "/dashboard"
    },
    {
      title: "Resource Allocation",
      description: "Manage resources efficiently across projects.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-indigo-500">
          <path fillRule="evenodd" d="M12 2.5c-2.86 0-5.5 1.67-5.5 4.5S9.14 11.5 12 11.5s5.5-1.67 5.5-4.5S14.86 2.5 12 2.5zm-1.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm4.5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 12.5c-1.93 0-3.5.52-3.5 1.5s1.57 1.5 3.5 1.5 3.5-.52 3.5-1.5-1.57-1.5-3.5-1.5z" clipRule="evenodd" />
        </svg>
      ),
      url: "/dashboard"
    },
    {
      title: "Reporting & Analytics",
      description: "Gain insights with powerful reporting tools.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-pink-500">
          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm3 2a1 1 0 00-1 1v10a1 1 0 001 1h4v-1H7V9h6v1h-2v1h2v1h-4v1h6V9h2v1h1V9a1 1 0 00-1-1H6z" clipRule="evenodd" />
        </svg>
      ),
      url: "/dashboard"
    }
  ];

  return (
    <section className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-yellow-100/30 via-blue-50/50 to-indigo-100/20 dark:from-slate-900/50 dark:via-slate-900/80 dark:to-slate-900/90 transition-colors duration-300">
      <div className="max-w-screen- w-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 lg:flex lg:items-center lg:gap-x-12">
        <div className="relative z-10 lg:w-[55%] text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Empower<span className="block bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-transparent">Your Team</span>
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-[36rem] mx-auto lg:mx-0">
            Take control of your projects with our comprehensive management system.
            From task tracking to resource allocation, we provide all the tools you need to succeed.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="py-3 px-8 text-lg font-semibold rounded-full text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:ring-4 focus:ring-indigo-300/30 focus:outline-none transition-colors duration-300 inline-block"
            >
              Get Started Today
            </Link>
          </div>
        </div>

        <div className="mt-16 lg:mt-0 lg:w-[45%]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Link
                key={index} // This fixes the React key warning!
                href={feature.url}
                className="group flex flex-col items-center space-y-4 bg-white/80 dark:bg-slate-950/90 border border-gray-200 dark:border-gray-700/70 p-5 rounded-2xl shadow-md hover:shadow-lg hover:border-blue-400/30 transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <div className="p-2.5 inline-flex items-center justify-center rounded-full bg-gray-100/70 dark:bg-slate-800/70 group-hover:bg-blue-100/50 group-hover:dark:bg-slate-700/70 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-center dark:text-slate-100">
                  {feature.title}
                </h3>
                <p className="text-sm text-center text-slate-600/80 dark:text-slate-300/80 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;





