"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeleteNotificationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl mx-4 p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-red-600">
            Delete Notification
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Are you sure you want to delete this notification?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-4 py-2 rounded-lg border"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant="destructive"
            className="px-4 py-2 rounded-lg"
          >
            {loading ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2 inline" />
            ) : null}
            Confirm Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
