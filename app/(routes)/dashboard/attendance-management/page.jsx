"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {io} from 'socket.io-client'

export default function AttendancePage() {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attendance marker state
  const [message, setMessage] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [lastDate, setLastDate] = useState(null);
  const [workMode, setWorkMode] = useState("office");
  const [isMarking, setIsMarking] = useState(false);

  // Approval/report state
  const [activeTab, setActiveTab] = useState(
    userRole === "admin" ? "approve" : "mark"
  );
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    present: 0,
    pending: 0,
    rejected: 0,
  });
  const [report, setReport] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    userId: "",
  });

  // Fetch user role on mount
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setUserRole(data.role);
        setActiveTab(data.role === "admin" ? "approve" : "mark");
        setIsLoading(false);
      })
      .catch(() => {
        setUserRole(null);
        setIsLoading(false);
      });
  }, []);

  // Fetch latest attendance (self)
  const fetchMyAttendance = async () => {
    try {
      const res = await fetch("/api/attendance/my-latest", {
        headers: { authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceStatus(data.approvalStatus);
        setLastDate(data.date);
        if (data.workMode) setWorkMode(data.workMode);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Mark attendance (self)
  const handleMarkAttendance = async () => {
    setIsMarking(true);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: "present", workMode }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Attendance marked (${workMode})!`);
        await fetchMyAttendance();
      } else {
        setMessage(data.error || "❌ Failed to mark attendance");
      }
    } catch (error) {
      setMessage("⚠️ Error marking attendance");
    } finally {
      setIsMarking(false);
    }
  };

  // ---------- For approval/report (admin/manager) ----------
  const fetchPending = async () => {
    const res = await fetch("/api/attendance/pending", {
      headers: { authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    if (res.ok) setRequests(data.pending);
  };

  const handleAction = async (id, action) => {
    const res = await fetch(`/api/attendance/approve/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setRequests(requests.filter((r) => r._id !== id));
      fetchSummary();
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/attendance/today", {
        headers: { authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) setSummary(data);
    } catch (err) {
      console.error("Error fetching summary", err);
    }
  };

  const fetchReport = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.userId) params.userId = filters.userId;
      const res = await axios.get("/api/attendance/report", {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setReport(res.data);
    } catch (err) {
      console.error("Error fetching report", err);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      report.map((r) => ({
        User: r.userId?.name || "",
        Date: format(new Date(r.date), "dd-MM-yyyy"),
        "Work Mode": r.workMode || "-",
        "Check In": r.checkIn || "-",
        "Check Out": r.checkOut || "-",
        Status: r.approvalStatus || "pending",
        "Approved By": r.approvedBy?.name || "-",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, "attendance_report.xlsx");
  };

  useEffect(() => {
    if (activeTab === "mark") fetchMyAttendance();
    if (activeTab === "approve") {
      fetchPending();
      fetchSummary();
    }
    if (activeTab === "report") fetchReport();
  }, [
    activeTab,
    filters.startDate,
    filters.endDate,
    filters.status,
    filters.userId,
  ]);

  const StatusBadge = ({ status }) => {
    if (!status) return null;
    let color =
      status === "Approved"
        ? "bg-green-100 text-green-700 border-green-400 dark:bg-green-900/20 dark:text-green-300 dark:border-green-500"
        : status === "Rejected"
        ? "bg-red-100 text-red-700 border-red-400 dark:bg-red-900/20 dark:text-red-300 dark:border-red-500"
        : "bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-500";
    return (
      <span
        className={`px-3 py-1 text-sm rounded-full border ${color} inline-block`}
      >
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-6 animate-pulse">
        <div className="w-64 h-8 bg-gray-200 dark:bg-slate-700 rounded mb-6" />
        <div className="h-96 bg-gray-100 dark:bg-slate-800 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 md:mb-8">
        Attendance Dashboard
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {(userRole === "member" || userRole === "manager") && (
          <button
            onClick={() => setActiveTab("mark")}
            className={`px-4 py-2 text-sm ${
              activeTab === "mark"
                ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Mark Attendance
          </button>
        )}
        {userRole !== "member" && (
          <button
            onClick={() => setActiveTab("approve")}
            className={`px-4 py-2 text-sm ${
              activeTab === "approve"
                ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Manage Requests
          </button>
        )}
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 text-sm ${
            activeTab === "report"
              ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-400 font-medium"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Attendance Report
        </button>
      </div>

      {/* Mark Attendance Tab (Member/Manager) */}
      {activeTab === "mark" &&
        (userRole === "member" || userRole === "manager") && (
          <div className=" flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-gray-200">
              📌 Mark Attendance
            </h2>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="workMode"
                  value="office"
                  checked={workMode === "office"}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="appearance-none rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 checked:bg-blue-600 checked:border-transparent focus:ring-2 focus:ring-blue-500 w-5 h-5"
                />
                <span className={workMode === "office" ? "font-medium" : ""}>
                  🏢 Office
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="workMode"
                  value="wfh"
                  checked={workMode === "wfh"}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="appearance-none rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 checked:bg-blue-600 checked:border-transparent focus:ring-2 focus:ring-blue-500 w-5 h-5"
                />
                <span className={workMode === "wfh" ? "font-medium" : ""}>
                  🏠 Work From Home
                </span>
              </label>
            </div>
            <button
              onClick={handleMarkAttendance}
              disabled={isMarking}
              className={`w-[500px] py-2 sm:py-3 rounded-lg text-white font-semibold transition ${
                isMarking
                  ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              }`}
            >
              {isMarking ? "Marking..." : "Mark Present"}
            </button>
            {message && (
              <p
                className={`mt-3 text-center font-medium ${
                  message.includes("✅")
                    ? "text-green-600 dark:text-green-400"
                    : message.includes("❌")
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              >
                {message}
              </p>
            )}
            {(attendanceStatus || lastDate || workMode) && (
              <div className="mt-4 text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Latest Attendance Status
                </p>
                {attendanceStatus && <StatusBadge status={attendanceStatus} />}
                {/* {lastDate && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Marked at: <span className="text-gray-900 dark:text-gray-300">{new Date(lastDate).toLocaleString()}</span>
                </p>
              )} */}
                {lastDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Marked at:{" "}
                    <span className="text-gray-900 dark:text-gray-300">
                      {format(new Date(lastDate), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </p>
                )}

                {workMode && (
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                    Mode:{" "}
                    <span className="font-normal">
                      {workMode === "wfh" ? "🏠 Work From Home" : "🏢 Office"}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      {/* Approve Requests Tab (Admin/Manager) */}
      {activeTab === "approve" &&
        (userRole === "admin" || userRole === "manager") && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900 text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {summary.present}
                </div>
                <div className="text-xs text-green-700 dark:text-green-400">
                  Marked Present
                </div>
              </div>
              <div className="p-4 rounded-lg border border-yellow-100 dark:border-yellow-900 bg-yellow-50 dark:bg-amber-900 text-center">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {summary.pending}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-400">
                  Pending
                </div>
              </div>
              <div className="p-4 rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900 text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {summary.rejected}
                </div>
                <div className="text-xs text-red-700 dark:text-red-400">
                  Rejected
                </div>
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
                      {req.userId?.name || "Unknown User"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {req.userId?.email || "-"}
                    </div>
                    <div className="text-xs mt-1">
                      {format(new Date(req.date), "PP")} •{" "}
                      <span className="capitalize text-blue-700 dark:text-blue-400">
                        {req.workMode || "Office"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req._id, "approve")}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req._id, "reject")}
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

      {/* Attendance Report Tab (All roles) */}
      {activeTab === "report" && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Attendance Report
          </h2>
          <div className="flex flex-wrap gap-3 items-center mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {userRole === "admin" && (
              <div>
                {/* <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">User</label> */}
                {/* <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) =>
                    setFilters({ ...filters, userId: e.target.value })
                  }
                  className="border border-gray-300 dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-300"
                /> */}
              </div>
            )}
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
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 mb-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Work Mode
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Approved By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.length > 0 ? (
                  report.map((att, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {att.userId?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {format(new Date(att.date), "dd-MM-yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300 capitalize">
                        {att.workMode || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300 capitalize">
                        {att.approvalStatus || "pending"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {att.approvedBy?.name || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-4 text-center text-gray-500 dark:text-gray-400"
                    >
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
