'use client';

import { Loader2, X } from 'lucide-react';


function DeleteProjectModal({ isOpen, projectName, onCancel, onConfirm, loading }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl mx-4 p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-red-600">Delete Project</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="text-gray-100 hover:text-gray-900 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Are you sure you want to delete the project <span className="font-semibold">{projectName}</span>?
        </p>
        <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 ${loading && 'opacity-70 hover:bg-red-600'}`}
          >
            {loading ? <Loader2 className="animate-spin mr-2 inline" /> : null}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteProjectModal;