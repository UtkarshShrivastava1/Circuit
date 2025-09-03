"use client";
import React, { useState, useEffect } from "react";

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [lastDate, setLastDate] = useState(null);
  const [workMode, setWorkMode] = useState("office"); // default selection

  // Mark attendance
  const handleMarkAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          status: "present",
          workMode, // ✅ send workMode
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Attendance marked successfully (${workMode})!`);
        await fetchMyAttendance(); // Refresh latest status
      } else {
        setMessage(data.error || "❌ Failed to mark attendance");
      }
    } catch (error) {
      setMessage("⚠️ Error marking attendance");
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest attendance status for this user
  const fetchMyAttendance = async () => {
    try {
      const res = await fetch("/api/attendance/my-latest", {
        headers: {
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.approvalStatus); // status: "Pending", "Approved", "Rejected"
        setLastDate(data.date);
        if (data.workMode) setWorkMode(data.workMode); // keep saved workMode
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  // Status badge component
  const StatusBadge = ({ status }) => {
    if (!status) return null;
    let color =
      status === "Approved"
        ? "bg-green-100 text-green-700 border-green-400"
        : status === "Rejected"
        ? "bg-red-100 text-red-700 border-red-400"
        : "bg-yellow-100 text-yellow-700 border-yellow-400";

    return (
      <span className={`px-3 py-1 text-sm rounded-full border ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        📌 Mark Attendance
      </h1>

      {/* Card */}
      <div className="bg-white shadow rounded-2xl p-6 border">
        {/* Work mode selection */}
        <div className="flex justify-between mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="workMode"
              value="office"
              checked={workMode === "office"}
              onChange={(e) => setWorkMode(e.target.value)}
            />
            <span>🏢 Office</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="workMode"
              value="wfh"
              checked={workMode === "wfh"}
              onChange={(e) => setWorkMode(e.target.value)}
            />
            <span>🏠 Work From Home</span>
          </label>
        </div>

        <button
          onClick={handleMarkAttendance}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold transition ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Marking..." : "Mark Present"}
        </button>

        {/* Feedback */}
        {message && (
          <p
            className={`mt-4 text-center font-medium ${
              message.includes("✅")
                ? "text-green-600"
                : message.includes("❌")
                ? "text-red-600"
                : "text-yellow-600"
            }`}
          >
            {message}
          </p>
        )}

        {/* Always show status */}
        {status && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-2">Latest Attendance Status</p>
            <StatusBadge status={status} />

            {lastDate && (
              <p className="text-sm text-gray-500 mt-2">
                {new Date(lastDate).toLocaleString()}
              </p>
            )}

            {workMode && (
              <p className="text-sm text-blue-600 mt-1">
                Mode: {workMode === "wfh" ? "🏠 Work From Home" : "🏢 Office"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
