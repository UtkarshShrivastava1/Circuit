"use client";
import { useState } from "react";
import { Bell } from "lucide-react";
import { useSocket } from "@/lib/useSocket";

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useSocket(userId, (data) => {
    setNotifications((prev) => [data, ...prev]);
  });

  return (
    <div className="relative">
      <Bell className="w-6 h-6 text-gray-700 cursor-pointer" />
      {notifications.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
          {notifications.length}
        </span>
      )}

      {/* Dropdown list */}
      <div className="absolute right-0 mt-2 w-64 bg-white shadow-md rounded-lg border">
        {notifications.length === 0 ? (
          <p className="p-2 text-gray-500 text-sm">No new notifications</p>
        ) : (
          notifications.map((n, i) => (
            <p key={i} className="p-2 text-sm border-b last:border-none">
              {n.message}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
