'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex flex-wrap border-b border-gray-200 mb-6 overflow-x-auto gap-2 pb-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`min-w-[80px] flex-shrink-0 px-4 py-2 -mb-px border-b-2 font-medium text-sm whitespace-nowrap touch-manipulation ${
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ percentage }) {
  const displayPercentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <div className="w-full h-5 rounded-full overflow-hidden transition-colors duration-300 bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={displayPercentage}>
      <div
        className={`h-5 bg-blue-600 dark:bg-blue-500 transition-[width] duration-500 rounded-full`}
        style={{ 
          width: `${displayPercentage}%`,
          minWidth: displayPercentage > 0 ? '4px' : '0px'
        }}
      />
    </div>
  );
}

function ProgressInfo({ used, total }) {
  return (
    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 flex flex-col sm:flex-row sm:justify-between gap-2">
      <span>
        Used <span className="font-semibold">{used}</span> of <span className="font-semibold">{total}</span> days
      </span>
      {total > used && (
        <span>
          Remaining <span className="font-semibold">{total - used}</span> days
        </span>
      )}
    </div>
  );
}

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState('apply');
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [usedLeaves, setUsedLeaves] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [reportLeaves, setReportLeaves] = useState([]);
  const [showPolicyAlert, setShowPolicyAlert] = useState(false);
  const [msg, setMsg] = useState('');
  const [policyForm, setPolicyForm] = useState({ maxPaidLeavesPerMonth: 0, notes: '' });
  const [form, setForm] = useState({ leaveType: 'paid', startDate: '', endDate: '', reason: '' });
  const [loading, setLoading] = useState(true);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  // Simplified helper function to format decision text
  const formatDecision = useCallback((decision) => {
    if (!decision) return 'N/A';
    
    const by = decision.by;
    const at = decision.at;
    
    let byName = 'Unknown';
    if (typeof by === 'object' && by !== null) {
      byName = by.name || by.email || 'Unknown';
    } else if (typeof by === 'string') {
      byName = `User ${by.slice(-4)}`;
    }
    
    const atDate = at ? new Date(at).toLocaleDateString() : 'N/A';
    
    return `By ${byName} on ${atDate}`;
  }, []);

  // UPDATED: Calculate total leave DAYS (not just leave requests)
  const calculateUsedLeaves = useCallback((leaves) => {
    if (!Array.isArray(leaves)) return 0;
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let totalDays = 0;
    
    leaves.forEach((l) => {
      const isPaid = ['paid', 'sick', 'casual'].includes(l.leaveType);
      const isApproved = l.status === 'approved';
      
      if (!isPaid || !isApproved) return;
      
      const startDate = l.startDate ? new Date(l.startDate) : null;
      const endDate = l.endDate ? new Date(l.endDate) : null;
      
      if (!startDate || !endDate) return;
      
      // Only count leaves that start within the current month
      const inDateRange = startDate >= monthStart;
      
      if (!inDateRange) return;
      
      // Calculate number of days INCLUDING the end date
      const dayCount = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      totalDays += dayCount;
    });
    
    return totalDays;
  }, []);

  // Fetch functions
  const fetchMyLeaves = useCallback(async () => {
    const token = getToken();
    if (!token) return [];
    
    try {
      const res = await fetch('/api/leave', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const leaves = json?.data || [];
        
        setMyLeaves(leaves);
        
        // Calculate used leaves (no user filtering needed - backend already filtered)
        const used = calculateUsedLeaves(leaves);
        setUsedLeaves(used);
        
        return leaves;
      }
    } catch (error) {
      console.error('Error fetching my leaves:', error);
    }
    return [];
  }, [calculateUsedLeaves]);

  const fetchPendingLeaves = useCallback(async () => {
    const token = getToken();
    if (!token) return [];
    
    try {
      const res = await fetch('/api/leave/pending', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const { leaves } = await res.json();
        setLeaveRequests(leaves || []);
        return leaves || [];
      }
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
    }
    return [];
  }, []);

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch('/api/leave-rule');
      if (res.ok) {
        const policyData = await res.json();
        setPolicy(policyData);
        setPolicyForm({ 
          maxPaidLeavesPerMonth: policyData?.maxPaidLeavesPerMonth || 0, 
          notes: policyData?.notes || '' 
        });
        return policyData;
      }
    } catch (error) {
      console.error('Error fetching policy:', error);
    }
    return null;
  }, []);

  const fetchAllLeavesForReport = useCallback(async (currentRole) => {
    const token = getToken();
    if (!token) return [];
    
    try {
      const url = currentRole === 'member' ? '/api/leave' : '/api/leave?report=true';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const leaves = json?.data || [];
        setReportLeaves(leaves);
        return leaves;
      }
    } catch (error) {
      console.error('Error fetching report leaves:', error);
    }
    return [];
  }, []);

  // Unified data fetching - similar to attendance pattern
  const fetchInitialData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch session first - similar to attendance
      const resSession = await fetch('/api/auth/session', { headers: { Authorization: `Bearer ${token}` } });
      if (!resSession.ok) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      const userData = await resSession.json();
      setUserRole(userData.role);
      setCurrentUser(userData); // Store current user info

      // Auto-switch admin to approve tab
      if (userData.role === 'admin' && activeTab === 'apply') {
        setActiveTab('approve');
      }

      // Fetch core data
      await Promise.all([
        fetchPolicy(),
      ]);

      // Fetch user-specific data
      await fetchMyLeaves();

      // Fetch role-specific data
      if (userData.role === 'admin' || userData.role === 'manager') {
        await fetchPendingLeaves();
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchMyLeaves, fetchPolicy, fetchPendingLeaves]);

  // Fetch tab-specific data
  const fetchTabData = useCallback(async () => {
    if (!userRole || loading) return;

    if (activeTab === 'report') {
      await fetchAllLeavesForReport(userRole);
    }
  }, [activeTab, userRole, loading, fetchAllLeavesForReport]);

  // Initial load - only runs once
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Tab-specific data
  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Remove 'history' tab for admin users
  const tabs = [
    (userRole === 'member' || userRole === 'manager') && { id: 'apply', label: 'Apply Leave' },
    (userRole === 'admin' || userRole === 'manager') && { id: 'approve', label: 'Approve Leaves' },
    (userRole === 'member' || userRole === 'manager') && { id: 'history', label: 'Leave History' },
    userRole === 'admin' && { id: 'policy', label: 'Leave Policy' },
    { id: 'report', label: 'Report' },
  ].filter(Boolean);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // Custom handler for policy number input to prevent leading zeros
  function handlePolicyInputChange(e) {
    const { name, value } = e.target;
    
    // Remove leading zeros and ensure it's a proper number
    let cleanValue = value.replace(/^0+/, '') || '0';
    
    // If it's empty after removing zeros, keep it empty
    if (value === '') cleanValue = '';
    
    setPolicyForm(prev => ({
      ...prev,
      [name]: cleanValue === '' ? '' : Number(cleanValue)
    }));
  }

  async function handleApply(e) {
    e.preventDefault();
    setMsg('');
    
    if (!form.startDate || !form.endDate) {
      setMsg('Please select start and end dates.');
      return;
    }
    
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setMsg('End date cannot be before start date.');
      return;
    }
    
    const token = getToken();
    if (!token) {
      setMsg('Unauthorized.');
      return;
    }

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg('Leave application submitted!');
        setForm({ leaveType: 'paid', startDate: '', endDate: '', reason: '' });
        // Refresh only necessary data
        await fetchMyLeaves();
        if (userRole === 'admin' || userRole === 'manager') {
          await fetchPendingLeaves();
        }
      } else {
        setMsg(data.error || 'Failed to submit leave.');
      }
    } catch (error) {
      setMsg('Failed to submit leave.');
    }
  }

  async function handleApprove(id, action) {
    const token = getToken();
    if (!token) {
      setMsg('Unauthorized.');
      return;
    }

    try {
      const res = await fetch('/api/leave/approve/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
        setLeaveRequests(prev => prev.filter(l => l._id !== id));
        
        // Refresh data to update progress bars
        await fetchMyLeaves();
        if (activeTab === 'report') {
          await fetchAllLeavesForReport(userRole);
        }
      } else {
        setMsg(data.error || 'Failed to update leave request.');
      }
    } catch (error) {
      setMsg('Failed to update leave request.');
    }
  }

async function handlePolicySave() {
  const token = getToken();
  if (!token) {
    setMsg('Unauthorized.');
    return;
  }

  try {
    console.log('Sending POST with _method=PUT to /api/leave-rule with:', policyForm);
    
    const res = await fetch('/api/leave-rule', {
      method: 'POST', // Changed from PUT to POST
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        ...policyForm,
        _method: 'PUT' // Add action indicator
      }),
    });
    
    console.log('Response status:', res.status);
    console.log('Response headers:', [...res.headers.entries()]);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log('Error response:', errorText);
      setMsg(`Failed to update policy: ${res.status} ${res.statusText}`);
      return;
    }
    
    const data = await res.json();
    if (data?.maxPaidLeavesPerMonth != null) {
      setPolicy(data);
      setShowPolicyAlert(true);
      setTimeout(() => setShowPolicyAlert(false), 4000);
      await fetchMyLeaves();
    } else {
      setMsg(data?.error || 'Failed to update policy.');
    }
  } catch (error) {
    console.error('Policy save error:', error);
    setMsg(`Failed to update policy: ${error.message}`);
  }
}

  function exportToExcel() {
    const worksheetData = (reportLeaves || []).map(l => {
      const userName = l?.userId?.name || l?.userId?.email || 'N/A';
      const start = l?.startDate ? new Date(l.startDate) : null;
      const end = l?.endDate ? new Date(l.endDate) : null;
      const decisionText = formatDecision(l?.decision);
      
      return {
        'User': userName,
        'Leave Type': l?.leaveType || 'N/A',
        'Start Date': start ? start.toLocaleDateString() : 'N/A',
        'End Date': end ? end.toLocaleDateString() : 'N/A',
        'Reason': l?.reason || '',
        'Status': l?.status || 'N/A',
        'Decision': decisionText,
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
    XLSX.writeFile(workbook, `Leave_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Progress calculation - user-specific
  const percentageUsed = policy && policy.maxPaidLeavesPerMonth > 0
    ? Math.min(100, (usedLeaves / policy.maxPaidLeavesPerMonth) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="max-w-full md:max-w-5xl mx-auto p-4 md:p-6 bg-white dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full md:max-w-5xl mx-auto p-4 md:p-6 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Leave Management
      </h1>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {showPolicyAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-sm w-full mx-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-500 rounded text-green-800 dark:text-green-200 text-center z-50">
          Leave policy updated successfully!
        </div>
      )}

      {msg && (
        <div className="mb-6 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded text-yellow-800 dark:text-yellow-200 max-w-full overflow-hidden">
          {msg}
        </div>
      )}

      {/* Monthly Leave Policy - Now styled like other sections */}
      {policy && (
        <section className="mb-6">
          <p className="mb-1 text-gray-700 dark:text-gray-300">
            Paid Leave Allowed: <span className="font-semibold">{policy.maxPaidLeavesPerMonth}</span> days/month
          </p>
          <ProgressBar percentage={percentageUsed} />
          <ProgressInfo used={usedLeaves} total={Number(policy.maxPaidLeavesPerMonth || 0)} />
          {policy.notes && <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{policy.notes}</p>}
        </section>
      )}

      {/* User-Friendly Leave Summary - Only for members and managers, not in admin or report tabs */}
      {(userRole === 'member' || userRole === 'manager') && 
       activeTab !== 'report' && 
       myLeaves.length > 0 && (
        <div className="mb-6 max-w-full lg:max-w-2xl mx-auto p-4 lg:p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="flex items-center mb-3">
            <span className="text-xl mr-2">📊</span>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Leave Summary</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Total Leaves: <span className="font-semibold text-slate-800 dark:text-slate-200">{myLeaves.length}</span>
          </p>
          
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm">My Leave History:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myLeaves.map((l, i) => {
                // Calculate days for display
                const start = l.startDate ? new Date(l.startDate) : null;
                const end = l.endDate ? new Date(l.endDate) : null;
                const days = start && end ? Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1 : 1;
                
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs">
                    <span className="flex-shrink-0 font-medium text-slate-600 dark:text-slate-300">
                      {i + 1}.
                    </span>
                    <span 
                      className="flex-shrink-0 px-2 py-1 rounded font-medium" 
                      style={{
                        color: '#fff',
                        backgroundColor: l.leaveType === 'paid' ? '#2563eb' : l.leaveType === 'sick' ? '#dc2626' : '#16a34a'
                      }}
                    >
                      {l.leaveType}
                    </span>
                    <span 
                      className="flex-shrink-0 px-2 py-1 rounded font-medium"
                      style={{
                        color: '#fff',
                        backgroundColor: l.status === 'approved' ? '#059669' : l.status === 'rejected' ? '#dc2626' : '#d97706'
                      }}
                    >
                      {l.status}
                    </span>
                    <span className="flex-shrink-0 text-slate-600 dark:text-slate-400">
                      {l.startDate ? new Date(l.startDate).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="flex-shrink-0 text-slate-600 dark:text-slate-400 font-medium">
                      ({days} day{days !== 1 ? 's' : ''})
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 break-all">
                      Decision: {formatDecision(l.decision)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <section>
        {activeTab === 'apply' && (userRole === 'member' || userRole === 'manager') && (
          <div className="max-w-full lg:max-w-2xl mx-auto p-4 lg:p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <form onSubmit={handleApply} className="space-y-4">
              <label className="block">
                <span className="text-gray-700 dark:text-gray-300 mb-1 block font-medium">Leave Type:</span>
                <select
                  name="leaveType"
                  value={form.leaveType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="paid">Paid</option>
                  <option value="sick">Sick</option>
                  <option value="casual">Casual</option>
                </select>
              </label>
              <label className="block">
                <span className="text-gray-700 dark:text-gray-300 mb-1 block font-medium">Start Date:</span>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </label>
              <label className="block">
                <span className="text-gray-700 dark:text-gray-300 mb-1 block font-medium">End Date:</span>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </label>
              <label className="block">
                <span className="text-gray-700 dark:text-gray-300 mb-1 block font-medium">Reason:</span>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter reason for leave..."
                />
              </label>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Submit Leave Application
              </button>
            </form>
          </div>
        )}

        {activeTab === 'approve' && (userRole === 'admin' || userRole === 'manager') && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Pending Leave Requests</h2>
            {(leaveRequests || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No pending leave requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">User</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Type</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Dates</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Days</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Reason</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {(leaveRequests || []).map(l => {
                      // Calculate days for display
                      const start = l.startDate ? new Date(l.startDate) : null;
                      const end = l.endDate ? new Date(l.endDate) : null;
                      const days = start && end ? Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1 : 1;

                      return (
                        <tr key={l._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{l.userId?.name || l.userId?.email || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white capitalize">{l.leaveType}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                            {l.startDate ? format(new Date(l.startDate), 'PP') : 'N/A'} – {l.endDate ? format(new Date(l.endDate), 'PP') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {days} day{days !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{l.reason}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleApprove(l._id, 'approve')}
                                className="min-w-[80px] px-3 py-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded text-sm transition-colors touch-manipulation"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApprove(l._id, 'reject')}
                                className="min-w-[80px] px-3 py-2 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded text-sm transition-colors touch-manipulation"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (userRole === 'member' || userRole === 'manager') && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">My Leave History</h2>
            {(myLeaves || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No leave history found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Type</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Dates</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Days</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Reason</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Status</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {(myLeaves || []).map(l => {
                      // Calculate days for display
                      const start = l.startDate ? new Date(l.startDate) : null;
                      const end = l.endDate ? new Date(l.endDate) : null;
                      const days = start && end ? Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1 : 1;

                      return (
                        <tr key={l._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-gray-900 dark:text-white capitalize">{l.leaveType}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                            {l.startDate ? format(new Date(l.startDate), 'PP') : 'N/A'} – {l.endDate ? format(new Date(l.endDate), 'PP') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {days} day{days !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{l.reason}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white capitalize">{l.status}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                            {formatDecision(l.decision)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Leave Report</h2>
            <button
              onClick={exportToExcel}
              className="mb-4 px-4 py-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              Export to Excel
            </button>
            {(reportLeaves || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No report data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">User</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Type</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Start Date</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">End Date</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Days</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Status</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Reason</th>
                      <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-medium">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {(reportLeaves || []).map(l => {
                      // Calculate days for display
                      const start = l.startDate ? new Date(l.startDate) : null;
                      const end = l.endDate ? new Date(l.endDate) : null;
                      const days = start && end ? Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1 : 1;

                      return (
                        <tr key={l._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{l.userId?.name || l.userId?.email || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white capitalize">{l.leaveType}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                            {l.startDate ? new Date(l.startDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                            {l.endDate ? new Date(l.endDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {days} day{days !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white capitalize">{l.status}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{l.reason || ''}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                            {formatDecision(l.decision)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Leave Policy Form - Updated with custom number input handler */}
        {/* {activeTab === 'policy' && userRole === 'admin' && (
          <div className="max-w-md mx-auto">
            <div className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Leave Policy</h2>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-gray-700 dark:text-gray-300 mb-1 block font-medium">Max Paid Leaves per Month:</span>
                  <input
                    type="number"
                    min={0}
                    name="maxPaidLeavesPerMonth"
                    value={policyForm.maxPaidLeavesPerMonth}
                    onChange={handlePolicyInputChange} // Use custom handler
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700 dark:text-gray-300 mb-1 block font-medium">Notes:</span>
                  <textarea
                    name="notes"
                    value={policyForm.notes}
                    onChange={(e) => setPolicyForm({ ...policyForm, notes: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </label>
                <button
                  onClick={handlePolicySave}
                  className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Save Policy
                </button>
              </div>
            </div>
          </div> */}
        {/* )} */}
        {/* Enhanced Leave Policy Form */}
{activeTab === 'policy' && userRole === 'admin' && (
  <div className="max-w-2xl mx-auto">
    {/* Header Section */}
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Leave Policy Configuration</h2>
      <p className="text-gray-600 dark:text-gray-400">Manage company-wide leave policies and allowances</p>
    </div>

    {/* Policy Card */}
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Policy Settings</h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-6">
        {/* Current Policy Overview */}
        {policy && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Current Policy
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Monthly Limit:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                  {policy.maxPaidLeavesPerMonth} days
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-5">
          {/* Max Leaves Field */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Maximum Paid Leaves per Month
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={31}
                name="maxPaidLeavesPerMonth"
                value={policyForm.maxPaidLeavesPerMonth}
                onChange={handlePolicyInputChange}
                className="w-full p-4 pr-12 text-lg font-medium border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                placeholder="Enter number of days"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium">
                days
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              Set the maximum number of paid leave days employees can take per month
            </p>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Policy Notes & Guidelines
            </label>
            <textarea
              name="notes"
              value={policyForm.notes}
              onChange={(e) => setPolicyForm({ ...policyForm, notes: e.target.value })}
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-400 resize-none"
              rows={4}
              placeholder="Add any additional notes, conditions, or guidelines for the leave policy..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              Provide additional context or special conditions for the leave policy
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handlePolicySave}
            className="flex-1 group relative px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:ring-4 focus:ring-blue-500/25"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Save Policy Changes
            </div>
          </button>
        </div>

        {/* Policy Impact Preview */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Policy Impact</h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                This policy will apply to all employees immediately after saving. 
                Current month's leave calculations will be updated automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      </section>
    </div>
  );
}
