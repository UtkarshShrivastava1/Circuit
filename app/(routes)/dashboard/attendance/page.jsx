'use client';
import React, { useState, useEffect } from 'react';

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [lastDate, setLastDate] = useState(null);
  const [workMode, setWorkMode] = useState('office');

  const handleMarkAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: 'present',
          workMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Attendance marked successfully (${workMode})!`);
        await fetchMyAttendance();
      } else {
        setMessage(data.error || '❌ Failed to mark attendance!');
      }
    } catch (error) {
      setMessage('⚠️ Error marking attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      const res = await fetch('/api/attendance/my-latest', {
        headers: {
          authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.approvalStatus);
        setLastDate(data.date);
        if (data.workMode) setWorkMode(data.workMode);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const StatusBadge = ({ status }) => {
    if (!status) return null;
    let color =
      status === 'Approved'
        ? 'bg-green-100 text-green-700 border-green-400 dark:bg-green-900/20 dark:text-green-300 dark:border-green-500'
        : status === 'Rejected'
        ? 'bg-red-100 text-red-700 border-red-400 dark:bg-red-900/20 dark:text-red-300 dark:border-red-500'
        : 'bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-500';

    return (
      <span
        className={`px-3 py-1 text-sm rounded-full border ${color} inline-block`}
      >
        {status}
      </span>
    );
  };

  // Mobile first, full width, snugger on desktop, no horizontal scroll
  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-white dark:bg-slate-900 ">
      <div className="max-w-lg w-full p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900 dark:text-gray-200">
          📌 Mark Attendance
        </h1>

        {/* Work mode selection */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="workMode"
              value="office"
              checked={workMode === 'office'}
              onChange={(e) => setWorkMode(e.target.value)}
              className="appearance-none rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 checked:bg-blue-600 checked:border-transparent focus:ring-2 focus:ring-blue-500 w-5 h-5"
            />
            <span className={workMode === 'office' ? 'font-medium' : ''}>
              🏢 Office
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="workMode"
              value="wfh"
              checked={workMode === 'wfh'}
              onChange={(e) => setWorkMode(e.target.value)}
              className="appearance-none rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 checked:bg-blue-600 checked:border-transparent focus:ring-2 focus:ring-blue-500 w-5 h-5"
            />
            <span className={workMode === 'wfh' ? 'font-medium' : ''}>
              🏠 Work From Home
            </span>
          </label>
        </div>

        <button
          onClick={handleMarkAttendance}
          disabled={loading}
          className={`w-full py-2 sm:py-3 rounded-lg text-white font-semibold transition ${
            loading
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
          }`}
        >
          {loading ? 'Marking...' : 'Mark Present'}
        </button>

        {/* Feedback */}
        {message && (
          <p
            className={`mt-3 sm:mt-4 text-center font-medium ${
              message.includes('✅')
                ? 'text-green-600 dark:text-green-400'
                : message.includes('❌')
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}
          >
            {message}
          </p>
        )}

        {/* Status, date, and work mode */}
        {(status || lastDate || workMode) && (
          <div className="mt-4 sm:mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Latest Attendance Status
            </p>
            {status && <StatusBadge status={status} />}
            {lastDate && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Marked at:{' '}
                <span className="text-gray-900 dark:text-gray-300">
                  {new Date(lastDate).toLocaleString()}
                </span>
              </p>
            )}
            {workMode && (
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                Mode:{' '}
                <span className="font-normal">
                  {workMode === 'wfh' ? '🏠 Work From Home' : '🏢 Office'}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
