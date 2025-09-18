"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {io} from 'socket.io-client'

export default function CreateTaskForm({
  projectId,
  projectName,
  currentUser,
  onTaskCreated,
  socket, 
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [priority, setPriority] = useState("medium");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);
  const [managerId, setManagerId] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  function toggleChecklistItem(index) {
    setChecklist((prev) => {
      const checklistCopy = [...prev];
      if (checklistCopy[index]) {
        checklistCopy[index].isCompleted = !checklistCopy[index].isCompleted;
        return checklistCopy;
      }
      return prev; // fallback, no mutation
    });
  }

  // Unique participant resolver
  function getUniqueParticipants() {
    const participantMap = new Map();
    [...managers, ...members].forEach((participant) => {
      const id = participant.userId || participant._id;
      if (id && !participantMap.has(id)) {
        participantMap.set(id, participant);
      }
    });
    return Array.from(participantMap.values);
  }

  // Enhanced checkbox handler for multi-select users
  function handleMemberCheckboxChange(memberId) {
    setMemberIds((prevIds) => {
      const cleanIds = [...new Set(prevIds)];
      if (cleanIds.includes(memberId)) {
        return cleanIds.filter((id) => id !== memberId);
      } else {
        return [...cleanIds, memberId];
      }
    });
  }

  // Send notification function
  function sendNotification(userId, notificationData) {
    if (socket && typeof socket.emit === "function") {
      socket.emit("notification", notificationData);
    }
  }

  useEffect(() => {
    async function fetchParticipants() {
      try {
        setError("");
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error("Failed to load project participants");
        const project = await res.json();
        setParticipants(project.participants || []);
        setManagers(project.managers || []);
        setMembers(project.members || []);
      } catch (e) {
        setError(e.message);
        setParticipants([]);
      }
    }
    if (projectId) fetchParticipants();
  }, [projectId]);

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    setChecklist([
      ...checklist,
      { item: newChecklistItem.trim(), isCompleted: false },
    ]);
    setNewChecklistItem("");
  }

  function removeChecklistItem(index) {
    setChecklist(checklist.filter((_, i) => i !== index));
  }

 
  async function handleSubmit(e) {
  e.preventDefault();
  setError('');
  if (!title.trim() || !description.trim()) {
    setError('Please fill in both title and description.');
    return;
  }

  if (memberIds.length === 0) {
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
      assignees: memberIds.map(id => ({ user: id, state: 'assigned' })), // ✅ use memberIds
      priority,
      estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
      ...(dueDate && { dueDate: new Date(dueDate) }),
      checklist: checklist.map(item => ({
        item: item.item,
        isCompleted: item.isCompleted,
      })),
    };

    console.log("task payload :", payload);

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

    // 🔔 Real-time notifications for each assignee
    memberIds.forEach(userId => {
      socket.emit('taskCreated', {
        senderId: currentUser._id,
        receiverId: userId,
        message: `New task assigned: "${title}" in project ${projectName}`,
        taskId: newTask._id,
      });
    });

    toast.success('Task created successfully!');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setEstimatedHours('');
    setDueDate('');
    setMemberIds([]);   // ✅ reset selected members
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


  // --- UI Section ---
  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-center text-gray-900 dark:text-white">
        Create Task
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              className="w-full px-3 py-2 text-sm sm:text-base rounded border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows={3}
              required
              className="w-full px-3 py-2 text-sm sm:text-base rounded border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Priority & Hours - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Estimated Hours
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="Hours"
              min={0}
              className="w-full px-3 py-2 text-sm sm:text-base rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-sm sm:text-base rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Assignees Selection - Responsive */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assign Members
          </label>
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 max-h-48 sm:max-h-64 overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No team members available
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:gap-3">
                {participants.map((participant) => {
                  const participantId = participant.userId || participant._id;
                  const isSelected = memberIds.includes(participantId);
                  return (
                    <label
                      key={participantId}
                      className={`flex items-center p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-900 border-blue-400 dark:border-blue-600"
                    : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-gray-600"
                }
              `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          handleMemberCheckboxChange(participantId)
                        }
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-3 flex-shrink-0"
                      />
                      <div className="flex items-center min-w-0 flex-1 gap-2">
                        {participant.avatarUrl && (
                          <img
                            src={participant.avatarUrl}
                            alt="avatar"
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                          />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center min-w-0 flex-1 gap-1 sm:gap-2">
                          <span
                            className={`text-sm font-medium truncate ${
                              isSelected
                                ? "text-blue-900 dark:text-blue-100"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {participant.username ||
                              participant.name ||
                              participant.email}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full flex-shrink-0 self-start sm:self-center
                  ${
                    ["admin", "manager", "project-manager"].includes(
                      (participant.roleInProject || "").toLowerCase()
                    )
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300"
                  }`}
                          >
                            {participant.roleInProject}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {memberIds.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Selected: {memberIds.length} member
              {memberIds.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Checklist Section - Responsive */}
        <div>
          <h3 className="font-semibold text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
            Sub Tasks
          </h3>

          {/* Add new item - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              type="text"
              placeholder="New checklist item"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              className="flex-1 p-2 text-sm sm:text-base rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
            />
            <button
              type="button"
              onClick={addChecklistItem}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>

          {/* Checklist items */}
          {checklist.length > 0 && (
            <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => toggleChecklistItem(idx)}
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm break-words ${
                      item.isCompleted
                        ? "line-through text-gray-500 dark:text-gray-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {item.item}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(idx)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex-shrink-0 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button - Full width on mobile */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 sm:py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm sm:text-base transition-colors duration-200 shadow-sm"
        >
          {submitting ? "Creating…" : "Create Task"}
        </button>
      </form>

      {/* Toast Container with responsive positioning */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="!mt-16 sm:!mt-0"
      />
    </div>
  );
}