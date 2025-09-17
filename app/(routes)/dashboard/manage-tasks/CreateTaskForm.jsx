'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from "socket.io-client";

export default function CreateTaskForm({ projectId, projectName, currentUser, onTaskCreated, socket}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState([]);

  // console.log(projectId, projectName, currentUser, onTaskCreated, socket)

  // New checklist item input
  const [newChecklistItem, setNewChecklistItem] = useState('');

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

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { item: newChecklistItem.trim(), isCompleted: false }]);
    setNewChecklistItem('');
  }

  function removeChecklistItem(index) {
    setChecklist(checklist.filter((_, i) => i !== index));
  }

  function toggleChecklistItem(index) {
  setChecklist(prev => {
    if (!prev[index]) return prev; // safeguard, do nothing if undefined
    const newChecklist = [...prev];
    newChecklist[index].isCompleted = !newChecklist[index].isCompleted;
    return newChecklist;
  });
}


 

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


      const SOCKET_URL =
      typeof window !== "undefined" && process?.env?.NEXT_PUBLIC_SOCKET_URL
        ? process.env.NEXT_PUBLIC_SOCKET_URL
        : window?.location?.origin || "";

    const socket = io(SOCKET_URL);

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
      estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
      ...(dueDate && { dueDate: new Date(dueDate) }),
      checklist: checklist.map(item => ({
        item: item.item,
        isCompleted: item.isCompleted,
      })),
    };

    // console.log("task payload :", payload);

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to create task');

    const newTask = await res.json();
    console.log(assigneeIds.map(id => ({ user: id, state: 'assigned' })))

    // --- Real-time notifications to assignees ---
    assigneeIds.forEach(userId => {
      socket.emit('taskCreated', {
        senderId: currentUser._id,
        receiverId: userId,
        message: `New task assigned: "${title}" in project ${projectName}`,
        taskId: newTask._id,
      });
    });
    // console.log("New Task :",newTask);

    toast.success('Task created successfully!');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setEstimatedHours('');
    setDueDate('');
    setAssigneeIds([]);
    setChecklist([]);
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
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900 dark:text-white">Create Task</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}

        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            required
            className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Task description"
            rows={4}
            required
            className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white"
          />
        </div>

        {/* Priority & Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Hours</label>
            <input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              placeholder="Estimated hours"
              min={0}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="block w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Assign Task To */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Task To</label>
          <select
            multiple
            value={assigneeIds}
            onChange={e => setAssigneeIds(Array.from(e.target.selectedOptions, o => o.value))}
            required
            className="block w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white min-h-[8rem]"
          >
            {participants.length === 0 ? (
              <option disabled>No participants in project</option>
            ) : (
              participants.map(p => (
                <option key={p.userId || p._id} value={p.userId || p._id}>
                  {p.username || p.name || p.email} ({p.roleInProject})
                </option>
              ))
            )}
          </select>
          <p className="text-xs italic text-gray-500 dark:text-gray-400">Hold Ctrl/Cmd to select multiple</p>
        </div>

        {/* Checklist */}
        <div className="space-y-2 mb-6">
          <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300">Sub Task</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="New checklist item"
              value={newChecklistItem}
              onChange={e => setNewChecklistItem(e.target.value)}
              className="flex-grow p-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
            <button type="button" onClick={addChecklistItem} className="px-4 bg-blue-600 text-white rounded-md">
              Add
            </button>
          </div>
          <ul className="space-y-1">
            {Array.isArray(checklist) && checklist.length > 0 && checklist.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  onChange={() => toggleChecklistItem(idx)}
                  className="w-4 h-4"
                />
                <span className={item.isCompleted ? 'line-through text-gray-500' : ''}>{item.item}</span>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(idx)}
                  className="ml-auto text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold disabled:opacity-50 transition"
        >
          {submitting ? 'Creating…' : 'Create Task'}
        </button>
      </form>
      <ToastContainer />
    </div>
  );
}
