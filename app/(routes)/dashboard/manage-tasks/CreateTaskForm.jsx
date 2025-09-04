'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CreateTaskForm({ projectId, projectName, currentUser, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchParticipants() {
      try {
        setError('');
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to load project participants');
        const project = await res.json();
        setParticipants(project.participants || []);
      } catch (e) {
        setError(e.message);
        setParticipants([]);
      }
    }
    if (projectId) fetchParticipants();
  }, [projectId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !description.trim()) {
      setError('Please fill in both title and description.');
      return;
    }
    if (assigneeIds.length === 0) {
      setError('Please select at least one assignee.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        projectId,
        projectName,
        userId: currentUser._id,
        assignees: assigneeIds.map(id => ({ user: id, state: 'assigned' })),
        priority,
        estimatedHours,
        dueDate,
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create task');

      toast.success('Task created successfully!');
      setTitle('');
      setDescription('');
      setPriority('medium');
      setEstimatedHours('');
      setDueDate('');
      setAssigneeIds([]);
      onTaskCreated?.();
    } catch (err) {
      console.error(err);
      setError(err.message);
      toast.error(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900 dark:text-white">
        Create Task
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="mt-1 text-red-600">{error}</div>}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            required
            className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description"
            rows={4}
            required
            className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estimated Hours
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="Estimated hours"
              min="1"
              className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assign Task To
          </label>
          <select
            multiple
            value={assigneeIds}
            onChange={(e) =>
              setAssigneeIds(
                Array.from(e.target.selectedOptions, (o) => o.value)
              )
            }
            required
            className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-36"
          >
            {participants.length === 0 ? (
              <option disabled>No participants in project</option>
            ) : (
              participants.map((p) => (
                <option key={p.userId || p._id} value={p.userId || p._id}>
                  {p.username || p.name || p.email} ({p.roleInProject})
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hold Ctrl/Cmd to select multiple participants.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Creating...' : 'Create Task'}
        </button>
      </form>

      <ToastContainer />
    </div>
  );
}
