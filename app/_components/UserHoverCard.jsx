"use client";

import { useState, useEffect } from "react";

export default function UserHoverCard({ email }) {
  const [isHovered, setIsHovered] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch user details when hovered
  useEffect(() => {
    if (isHovered && !user && email) {
      setLoading(true);
      fetch(`/api/user/${encodeURIComponent(email)}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data); ///

          // console.log("User List  : ",data.user)
        })
        .catch((err) => {
          console.error("Error fetching user:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [isHovered, user, email]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <img
        src={user?.profileImgUrl
 || "/user.png"}
        alt={user?.name || email}
        className="w-10 h-10 rounded-full border cursor-pointer"
      />

      {/* Hover Card */}
      {isHovered && (
        <div className="absolute left-0 mt-2 w-56 bg-white shadow-lg rounded-lg p-4 border z-50">
          {loading ? (
            <p className="text-xs text-gray-500">Loading...</p>
          ) : user ? (
            <>
              <div className="flex items-center space-x-3">
                <img
                  src={user.profileImgUrl || "/user.png"}
                  alt={user.name || email}
                  className="w-12 h-12 rounded-full border"
                />
                <div>
                  <h4 className="text-sm font-semibold">{user.name}</h4>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              {user.role && (
                <p className="mt-2 text-xs text-gray-600">
                  <strong>Role:</strong> {user.role}
                </p>
              )}

              {user.responsibility && (
                <p className="mt-1 text-xs text-gray-500">{user.responsibility}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-red-500">User not found</p>
          )}
        </div>
      )}
    </div>
  );
}
