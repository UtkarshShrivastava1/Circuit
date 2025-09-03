"use client"
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function TaskDetailPage() {
  const router = useRouter();
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchUserAndTask() {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
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
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserAndTask();
  }, [taskId, router]);

  async function handleStatusSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      toast.success('Status updated successfully');
      // Optionally refresh task or update local state
      setTask(prev => ({ ...prev, status }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!task) return <div>Task not found</div>;

//  export default function TaskDetails({ task }) {
//   if (!task) return <div className="text-center p-6">No task data found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
      <ToastContainer
  position="top-right"
  autoClose={3000}           // auto close after 3 seconds
  hideProgressBar={true}     // hide progress bar for simpler look
  newestOnTop={false}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
  icon={false}               // hide default success/error icon
/>
      <h1 className="text-3xl font-bold mb-4">{task.title}</h1>
      
       {userRole === 'member' ? (
        <div className="mb-4">
          <label htmlFor="status" className="font-semibold block mb-1">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded p-2 w-48"
            disabled={saving}
          >
            <option value="pending">Pending</option>
            <option value="ongoing">Ongoing</option>
            <option value="deployment">Deployment</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={handleStatusSave}
            disabled={saving}
            className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      ) : (
        <p className="mb-4">
          <span className="font-semibold">Status:</span>{' '}
          <span className="capitalize">{task.status || 'pending'}</span>
        </p>
      )}
      
      <p className="mb-4">
        <span className="font-semibold">Description:</span><br />
        {task.description || "-"}
      </p>
      
      <div className="mb-4">
        <h2 className="font-semibold text-xl mb-2">Assignees:</h2>
        <ul className="list-disc list-inside space-y-1">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map((a) => (
              <li key={a.user._id} className="truncate">
                {a.user.name || a.user.email || "Unknown User"}
              </li>
            ))
          ) : (
            <li>No assignees</li>
          )}
        </ul>
      </div>
      
      <div className="mb-4">
        <p>
          <span className="font-semibold">Priority:</span> {task.priority || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Progress:</span> {task.progress ?? 0}%
        </p>
        <p>
          <span className="font-semibold">Created At:</span>{" "}
          {new Date(task.createdAt).toLocaleString() || "-"}
        </p>
        <p>
          <span className="font-semibold">Updated At:</span>{" "}
          {new Date(task.updatedAt).toLocaleString() || "-"}
        </p>
      </div>
      
      {task.tickets && task.tickets.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-xl mb-2">Tickets:</h2>
          <ul className="space-y-3">
            {task.tickets.map((ticket) => (
              <li key={ticket._id} className="border rounded p-3 bg-gray-50 dark:bg-gray-700">
                <p className="font-semibold">{ticket.issueTitle}</p>
               <p className="mb-2">
                  <span className="font-semibold">Status:</span>{" "}
                  <span className={`capitalize ${ticket.status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {ticket.status || "open"}
                  </span>
                </p>
                <p>Description: {ticket.description}</p>
                <p>Priority: {ticket.priority}</p>
                <p>Start: {ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : "-"}</p>
                <p>Due: {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "-"}</p>
                <p>Tag: {ticket.tag}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
   {userRole !== "member" && (
  <div className="mt-6 space-x-4">
    <button
      onClick={() =>
        router.push(`/dashboard/manage-tasks/${task._id}/update?projectName=${encodeURIComponent(task.projectId)}`)
      }
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
    >
      Edit
    </button>

    <button
      onClick={() => handleDeleteTask(task._id)}
      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
    >
      Delete
    </button>
  </div>
)}

    </div>
  );
}
