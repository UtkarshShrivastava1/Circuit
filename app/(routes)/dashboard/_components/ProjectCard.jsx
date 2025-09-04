'use client';
import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import UserHoverCard from '@/app/_components/UserHoverCard';

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

const ProjectCard = ({ project, onDeleted }) => {
  const {
    projectName,
    projectState,
    projectDomain,
    startDate,
    endDate,
    participants,
  } = project;

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const router = useRouter();

  const handleRedirect = (e) => {
    e.preventDefault();
    setLoading(true);
    router.push(`/dashboard/projects/${projectName}`);
  };

  const handleDeleteButton = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`/api/projects/${projectName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
      if (!res.ok) {
        setDeleteError(`Failed to delete: ${data?.error || 'Unknown error'}`);
        return;
      }
      if (onDeleted) onDeleted(projectName);
    } catch (error) {
      setDeleteError('Network error deleting the project.');
      console.error(error);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const projectManager = participants.find(
    (p) => p.roleInProject === 'project-manager'
  );

  const projectMembers = participants.filter(
    (p) => p.roleInProject === 'project-member'
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <>
      <DeleteProjectModal
        isOpen={showDeleteModal}
        projectName={projectName}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
      <Card className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="p-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 rounded-t-xl">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white text-center">
            {projectName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 dark:bg-slate-900 space-y-3">
          {/* Project State Badge */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">State:</span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                projectState === 'ongoing'
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                  : projectState === 'completed'
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {projectState?.charAt(0).toUpperCase() + projectState?.slice(1)}
            </span>
          </div>
          {/* Domain */}
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Domain:</span>{' '}
            <span className="text-gray-900 dark:text-gray-200">
              {projectDomain || 'N/A'}
            </span>
          </div>
          {/* Duration */}
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>{' '}
            <span className="text-gray-900 dark:text-gray-200">
              {formatDate(startDate)} to {formatDate(endDate)}
            </span>
          </div>
          {/* Project Manager */}
          {projectManager && (
            <div className="mt-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Project Manager
              </span>
              <div className="flex items-start gap-3 mt-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                <div className="flex-shrink-0">
                  <UserHoverCard email={projectManager.email} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-gray-900 dark:text-white">
                    {projectManager.username}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {projectManager.email}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {projectManager.responsibility}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Members Grid */}
          {projectMembers.length > 0 && (
            <div className="mt-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">Team</span>
              <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                {projectMembers.map((member, idx) => (
                  <div key={idx} className="w-full">
                    <UserHoverCard email={member.email} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 rounded-b-xl flex gap-3">
          <button
            onClick={handleRedirect}
            disabled={loading || deleting}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-70 disabled:hover:bg-blue-600 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin inline" />
            ) : (
              'Details'
            )}
          </button>
          <button
            onClick={handleDeleteButton}
            disabled={loading || deleting}
            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-70 disabled:hover:bg-red-600 transition-colors"
          >
            {deleting ? (
              <Loader2 className="h-5 w-5 animate-spin inline" />
            ) : (
              'Delete'
            )}
          </button>
        </CardFooter>
      </Card>
      {deleteError && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg text-center text-red-700 dark:text-red-200">
          {deleteError}
        </div>
      )}
    </>
  );
};

export default ProjectCard;
