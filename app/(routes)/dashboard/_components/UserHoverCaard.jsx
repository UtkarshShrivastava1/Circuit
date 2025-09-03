"use client";

import { useState } from "react";

export default function UserHoverCard({ user }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!user) return null;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <img
        src={user.image || "/default-avatar.png"}
        alt={user.name || "User"}
        className="w-10 h-10 rounded-full border cursor-pointer"
      />

      {/* Hover Card */}
      {isHovered && (
        <div className="absolute left-0 mt-2 w-56 bg-white shadow-lg rounded-lg p-4 border z-50">
          <div className="flex items-center space-x-3">
            <img
              src={user.image || "/default-avatar.png"}
              alt={user.name || "User"}
              className="w-12 h-12 rounded-full border"
            />
            <div>
              <h4 className="text-sm font-semibold">{user.name || "Unknown"}</h4>
              <p className="text-xs text-gray-500">{user.email || "No email"}</p>
            </div>
          </div>

          {user.role && (
            <p className="mt-2 text-xs text-gray-600">
              <strong>Role:</strong> {user.role}
            </p>
          )}

          {user.bio && (
            <p className="mt-1 text-xs text-gray-500">{user.bio}</p>
          )}
        </div>
      )}
    </div>
  );
}
