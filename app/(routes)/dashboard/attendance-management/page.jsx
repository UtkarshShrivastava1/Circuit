"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function AttendanceManagementPage() {
  const [activeTab, setActiveTab] = useState("approve");

  // ---------- APPROVE ATTENDANCE ----------
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (activeTab === "approve") {
      fetchPending();
      fetchSummary();
    }
  }, [activeTab]);

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
      fetchSummary(); // refresh counts when approving/rejecting
    }
  };

  // ---------- TODAY’S SUMMARY ----------
  const [summary, setSummary] = useState({ present: 0, pending: 0, rejected: 0 });

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

  // ---------- ATTENDANCE REPORT ----------
  const [report, setReport] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    userId: "",
  });

  useEffect(() => {
    if (activeTab === "report") fetchReport();
  }, [activeTab]);

  const fetchReport = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.userId) params.userId = filters.userId;

      const token = localStorage.getItem("token");

      const res = await axios.get("/api/attendance/report", {
        params,
        headers: { Authorization: `Bearer ${token}` },
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
        Date: format(new Date(r.date), "yyyy-MM-dd"),
        WorkMode: r.workMode || "-", // <-- Added site field
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

  // ---------- RENDER ----------
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Attendance Management</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("approve")}
          className={`px-4 py-2 ${
            activeTab === "approve"
              ? "border-b-2 border-blue-600 font-semibold"
              : "text-gray-500"
          }`}
        >
          Approve Attendance
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 ${
            activeTab === "report"
              ? "border-b-2 border-blue-600 font-semibold"
              : "text-gray-500"
          }`}
        >
          Attendance Report
        </button>
      </div>

      {/* Approve Tab */}
      {activeTab === "approve" && (
        <div>
          {/* Today’s Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-100 border border-green-300 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{summary.present}</p>
              <p className="text-sm text-green-600">Present Today</p>
            </div>
            <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-700">{summary.pending}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
            <div className="bg-red-100 border border-red-300 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{summary.rejected}</p>
              <p className="text-sm text-red-600">Rejected</p>
            </div>
          </div>

          <h2 className="text-lg font-medium mb-4">
            Pending Attendance Requests
          </h2>
          {requests.map((req) => (
            <div
              key={req._id}
              className="flex justify-between items-center border p-3 mb-2 rounded"
            >
              <div>
                <p className="font-medium">
                  {req.userId?.name || "Unknown User"} (
                  {req.userId?.email || "N/A"})
                </p>
                <p>Date: {new Date(req.date).toDateString()}</p>
                <p>Work Mode: {req.workMode || "-"}</p> 
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleAction(req._id, "approve")}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(req._id, "reject")}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p>No pending requests</p>}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === "report" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Attendance Report</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="border p-2 rounded"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="border p-2 rounded"
            />
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="border p-2 rounded"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={fetchReport}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Apply
            </button>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Export Excel
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">User</th>
                  <th className="border p-2">Date</th>
                   <th className="border p-2">Work Mode</th> {/* <-- New Column */}
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Approved By</th>
                </tr>
              </thead>
              <tbody>
                {report.map((att, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border p-2">{att.userId?.name}</td>
                    <td className="border p-2">
                      {format(new Date(att.date), "yyyy-MM-dd")}
                    </td>
                    <td className="border p-2">{att.workMode || "-"}</td>
                    <td className="border p-2 capitalize">
                      {att.approvalStatus || "pending"}
                    </td>
                    <td className="border p-2">
                      {att.approvedBy?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
