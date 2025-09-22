// components/Loading.jsx
import React from "react";

export default function Loading({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="animate-spin rounded-full border-4 border-t-4 border-gray-300 border-t-blue-500 h-10 w-10 mb-4 shadow-lg">
        </div>
        {/* Loading text */}
        <span className="text-lg font-medium text-white drop-shadow-lg animate-pulse">{message}</span>
      </div>
    </div>
  );
}
