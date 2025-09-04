'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2 } from 'lucide-react';

export default function TaskDetailPage() {
  const router = useRouter();
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);

  // Custom delete confirmation: open modal
  const openDeleteModal = (taskId) => {
    setPendingDeleteTaskId(taskId);
    setShowDeleteModal(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDeleteTaskId(null);
  };

  // Execute delete after confirmation
  async function handleDeleteTask() {
    if (!pendingDeleteTaskId) return;
    setDeleting(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required');
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${pendingDeleteTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete task');
        return;
      }
      toast.success('Task deleted successfully');
      router.push('/dashboard/tasks');
    } catch (err) {
      toast.error('Network error deleting task');
      console.error(err);
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  }

  // Fetch task and user role
  useEffect(() => {
    async function fetchUserAndTask() {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');
      try {
        const [resUser, resTask] = await Promise.all([
          fetch('/api/auth/session', { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tasks/${taskId}`),
        ]);
        if (!resUser.ok || !resTask.ok) throw new Error('Failed to load data');
        const userData = await resUser.json();
        const taskData = await resTask.json();
        setUserRole(userData.role);
        setTask(taskData);
        setStatus(taskData.status || 'pending');
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUserAndTask();
  }, [taskId, router]);

  // Save status (members only)
  async function handleStatusSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }
      toast.success('Status updated');
      setTask(prev => ({ ...prev, status }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
    );
  }
  if (!task) return <div className="mt-6 text-center text-red-500">Task not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 rounded-xl bg-white dark:bg-slate-900 shadow-md">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{task.title}</h1>

      {/* Status - editable for members */}
      {userRole === 'member' ? (
        <div className="mb-4">
          <label
            htmlFor="status"
            className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
          >
            Status
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
              className="w-full sm:w-48 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="ongoing">Ongoing</option>
              <option value="deployment">Deployment</option>
              <option value="completed">Completed</option>
            </select>
            <button
              onClick={handleStatusSave}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin mr-2 h-5 w-5 inline" /> : null}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-4">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>{' '}
          <span className="capitalize">{task.status || 'pending'}</span>
        </p>
      )}

      {/* Description */}
      <p className="mb-4">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Description:</span>
        <br />
        <span className="text-gray-900 dark:text-gray-200">
          {task.description || "-"}
        </span>
      </p>

      {/* Assignees */}
      <div className="mb-4">
        <h2 className="font-semibold text-xl mb-2 text-gray-700 dark:text-gray-300">Assignees:</h2>
        <ul className="space-y-1">
          {task.assignees?.length ? (
            task.assignees.map((a) => (
              <li key={a?.user?._id || a?._id} className="truncate text-gray-900 dark:text-gray-200">
                {a?.user?.name || a?.user?.email || "Unknown User"}
              </li>
            ))
          ) : (
            <li className="text-gray-500 dark:text-gray-400">No assignees</li>
          )}
        </ul>
      </div>

      {/* Task Details */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Priority:</span>{' '}
          <span className="capitalize text-gray-900 dark:text-gray-200">{task.priority || "N/A"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Progress:</span>{' '}
          <span className="text-gray-900 dark:text-gray-200">{task.progress ?? 0}%</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Project:</span>{' '}
          <span className="text-gray-900 dark:text-gray-200">{task.projectName || "N/A"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Created at:</span>{' '}
          <span className="text-gray-900 dark:text-gray-200">
            {task.createdAt ? new Date(task.createdAt).toLocaleString() : "-"}
          </span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Updated at:</span>{' '}
          <span className="text-gray-900 dark:text-gray-200">
            {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "-"}
          </span>
        </div>
      </div>

      {/* Tickets */}
      {task.tickets?.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-xl mb-2 text-gray-700 dark:text-gray-300">Tickets:</h2>
          <ul className="space-y-3">
            {task.tickets.map((ticket) => (
              <li key={ticket?._id} className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <p className="font-semibold text-gray-900 dark:text-white">{ticket?.issueTitle}</p>
                <p className="mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>{' '}
                  <span className={`capitalize ${ticket?.status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {ticket?.status || "open"}
                  </span>
                </p>
                <p className="text-gray-900 dark:text-gray-200">Description: {ticket?.description || "-"}</p>
                <p className="text-gray-900 dark:text-gray-200">Priority: {ticket?.priority || "-"}</p>
                <p className="text-gray-900 dark:text-gray-200">Start: {ticket?.startDate ? new Date(ticket.startDate).toLocaleDateString() : "-"}</p>
                <p className="text-gray-900 dark:text-gray-200">Due: {ticket?.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "-"}</p>
                <p className="text-gray-900 dark:text-gray-200">Tag: {ticket?.tag || "-"}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit/Delete - visible for non-members */}
      {userRole !== "member" && (
        <div className="mt-6 space-x-4">
          <button
            onClick={() => router.push(`/dashboard/manage-tasks/${task._id}/update?projectName=${encodeURIComponent(task.projectId)}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            Edit
          </button>
          <button
            onClick={() => openDeleteModal(task._id)}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
          >
            {deleting ? <Loader2 className="animate-spin mr-2 h-5 w-5 inline" /> : null}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      {/* Creative Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative max-w-md w-full p-6 rounded-xl shadow-lg bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Confirm Deletion
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 font-medium rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={deleting}
                className="px-4 py-2 font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-70"
              >
                {deleting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin mr-2 h-5 w-5 inline" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
