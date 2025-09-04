'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function AttendanceManagementPage() {
  const [activeTab, setActiveTab] = useState('approve');
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ present: 0, pending: 0, rejected: 0 });
  const [report, setReport] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
  });

  // ---------- Approve Attendance ----------
  const fetchPending = async () => {
    const res = await fetch('/api/attendance/pending', {
      headers: { authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await res.json();
    if (res.ok) setRequests(data.pending);
  };

  const handleAction = async (id, action) => {
    const res = await fetch(`/api/attendance/approve/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setRequests(requests.filter((r) => r._id !== id));
      fetchSummary();
    }
  };

  // ---------- Today’s Summary ----------
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/attendance/today', {
        headers: { authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) setSummary(data);
    } catch (err) {
      console.error('Error fetching summary', err);
    }
  };

  // ---------- Attendance Report ----------
  const fetchReport = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.userId) params.userId = filters.userId;

      const res = await axios.get('/api/attendance/report', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setReport(res.data);
    } catch (err) {
      console.error('Error fetching report', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'approve') {
      fetchPending();
      fetchSummary();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'report') fetchReport();
  }, [activeTab]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      report.map((r) => ({
        User: r.userId?.name || '',
        Date: format(new Date(r.date), 'yyyy-MM-dd'),
        'Work Mode': r.workMode || '-',
        'Check In': r.checkIn || '-',
        'Check Out': r.checkOut || '-',
        Status: r.approvalStatus || 'pending',
        'Approved By': r.approvedBy?.name || '-',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, 'attendance_report.xlsx');
  };

  // ---------- RENDER ----------
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 md:mb-8">
        Attendance Management Dashboard
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('approve')}
          className={`px-4 py-2 text-sm ${
            activeTab === 'approve'
              ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Manage Requests
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 text-sm ${
            activeTab === 'report'
              ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Exportable Report
        </button>
      </div>

      {/* Approve Requests Tab */}
      {activeTab === 'approve' && (
        <div>
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {summary.present}
              </div>
              <div className="text-xs text-green-700 dark:text-green-400">Marked Present</div>
            </div>
            <div className="p-4 rounded-lg border border-yellow-100 dark:border-yellow-900 bg-yellow-50 dark:bg-amber-900 text-center">
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {summary.pending}
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-400">Pending</div>
            </div>
            <div className="p-4 rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900 text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {summary.rejected}
              </div>
              <div className="text-xs text-red-700 dark:text-red-400">Rejected</div>
            </div>
          </div>

          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Attendance Requests
          </h2>
          {requests.length > 0 ? (
            requests.map((req) => (
              <div
                key={req._id}
                className="flex flex-col md:flex-row justify-between md:items-center p-4 mb-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-sm transition-shadow duration-200"
              >
                <div className="mb-2 md:mb-0">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {req.userId?.name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {req.userId?.email || '-'}
                  </div>
                  <div className="text-xs mt-1">
                    {format(new Date(req.date), 'PP')} •{' '}
                    <span className="capitalize text-blue-700 dark:text-blue-400">
                      {req.workMode || 'Office'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(req._id, 'approve')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(req._id, 'reject')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400">
              No pending requests to manage.
            </div>
          )}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Attendance Report
          </h2>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Apply
              </button>
              <button
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
              >
                Export Excel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 mb-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Work Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.length > 0 ? (
                  report.map((att, i) => (
                    <tr key={i} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">{att.userId?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {format(new Date(att.date), 'yyyy-MM-dd')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300 capitalize">
                        {att.workMode || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300 capitalize">
                        {att.approvalStatus || 'pending'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {att.approvedBy?.name || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      No records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
