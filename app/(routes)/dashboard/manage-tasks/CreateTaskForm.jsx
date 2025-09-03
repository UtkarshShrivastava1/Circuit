"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export default function CreateTaskForm({ projectId, projectName, currentUser, onTaskCreated }) {
  // console.log(projectId, currentUser, onTaskCreated)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [priority, setPriority] = useState("medium"); // 🔹 from model
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
  async function fetchParticipants() {
    try {
      setError("");
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project participants");
      const project = await res.json();
      console.log(project.participants);
      
      const participants = project.participants || [];
      setParticipants(participants);
      
      // ✅ Access role for each participant
      participants.forEach((participant, index) => {
        console.log(`Participant ${index}:`);
        console.log(`- Email: ${participant.email}`);
        console.log(`- Role: ${participant.roleInProject}`);           // ✅ Access role
        console.log(`- Responsibility: ${participant.responsibility}`);
        console.log(`- ID: ${participant._id}`);
      });
      
      // ✅ Or get specific roles
      const projectManagers = participants.filter(p => p.roleInProject === "project-manager");
      const projectMembers = participants.filter(p => p.roleInProject === "project-member");
      
      console.log("Project Managers:", projectManagers.map(p => ({
        email: p.email,
        role: p.roleInProject
  // ✅ Access role
      })));
      
      console.log("Project Members:", projectMembers.map(p => ({
        email: p.email, 
        role: p.roleInProject
  // ✅ Access role
      })));
      
    } catch (e) {
      setError(e.message);
      setParticipants([]);
    }
  }
  if (projectId) fetchParticipants();
}, [projectId]);


 async function handleSubmit(e) {
  e.preventDefault();
  setError("");

  try {
    if (!title.trim() || !description.trim()) {
      setError("Please fill in both title and description.");
      return;
    }
    if (assigneeIds.length === 0) {
      setError("Please select at least one person to assign this task.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required");
      router.push("/login");
      return;
    }

    setSubmitting(true);

    // ✅ Convert assigneeIds into required format
    const payload = {
      title: title.trim(),
      description: description.trim(),
      projectId,
      projectName,   // Include projectName in your task creation payload
      userId: currentUser._id,
      assignees: assigneeIds.map((id) => ({
        user: id,
        state: "assigned",
      })),
    };

    console.log("Sending task payload:", payload);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Task form data : ",data)

    if (!res.ok) {
      console.error("Server error:", data);
      throw new Error(data.error || "Failed to create task");
    }

    toast.success("Task created successfully!");
    setTitle("");
    setDescription("");
    setAssigneeIds(["projectManagers","projectMembers"]);
    onTaskCreated?.();
  } catch (err) {
    console.error("Task creation error:", err);
    setError(err.message || "Something went wrong");
    toast.error(err.message || "Failed to create task");
  } finally {
    setSubmitting(false);
  }
}


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded bg-gray-50"
    >
      <h2 className="text-xl font-bold">Create Task</h2>
      {error && <p className="text-red-600">{error}</p>}

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        required
        className="border rounded w-full px-3 py-2"
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Task description"
        rows={4}
        required
        className="border rounded w-full px-3 py-2"
      />
 
      {/* Priority */}
      <label className="block font-semibold mb-1">Priority</label>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="border rounded w-full px-3 py-2"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>

      {/* Estimated Hours */}
      <input
        type="number"
        value={estimatedHours}
        onChange={(e) => setEstimatedHours(e.target.value)}
        placeholder="Estimated hours"
        min="1"
        className="border rounded w-full px-3 py-2"
      />

      {/* Due Date */}
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="border rounded w-full px-3 py-2"
      />

      {/* Assignees */}
      <label className="block font-semibold mb-1">Assign Task To</label>
      <select
        multiple
        value={assigneeIds}
        onChange={(e) =>
          setAssigneeIds(Array.from(e.target.selectedOptions).map((o) => o.value))
        }
        className="border rounded w-full px-3 py-2 h-36"
        required
      >
        {participants.length === 0 && (
          <option disabled>No participants in project</option>
        )}
        {participants
          .filter((p) => (p.userId || p._id) !== currentUser._id)
          .map((p) => (
            <option key={p.userId || p._id} value={p.userId || p._id}>
              {p.username || p.name || p.email} ({p.roleInProject})
            </option>
          ))}
      </select>
      <small className="text-gray-500">
        Hold Ctrl / Cmd to select multiple participants.
      </small>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Task"}
      </button>

      <ToastContainer />
    </form>
  );
}