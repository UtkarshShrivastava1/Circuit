"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TaskUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId;
 
  // ✅ Fix projectName extraction - check your URL structure
  const projectName = params.projectId || params.project; // Try both possible param names

  const [currentUser, setCurrentUser] = useState(null);
  const [task, setTask] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState("");
  const [memberIds, setMemberIds] = useState([]);

  const [tickets, setTickets] = useState([]);
  const [newTicket, setNewTicket] = useState({
    issueTitle: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    startDate: "",
    dueDate: "",
    tag: "other",
  });

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [error, setError] = useState("");

  // ✅ Debug logs only on mount and when critical values change
  useEffect(() => {
    console.log("🔍 Component initialized:");
    console.log("- taskId:", taskId);
    console.log("- projectName:", projectName);
    console.log("- URL params:", params);
    
    // ✅ If projectName is still undefined, log the full URL for debugging
    if (!projectName) {
      console.log("❌ projectName is undefined. Current URL:", window.location.pathname);
      console.log("Available params:", Object.keys(params));
    }
  }, []); // Only run once on mount

  // ✅ Fetch current user session
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setLoadingUser(true);
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const userData = await res.json();
        setCurrentUser(userData);
      } catch (e) {
        console.error("❌ Error fetching user session:", e);
        router.push("/login");
      } finally {
        setLoadingUser(false);
      }
    }

    fetchCurrentUser();
  }, [router]);

  // ✅ Fetch task, participants, and tickets only after user is loaded
  useEffect(() => {
    if (!currentUser || !taskId) {
      return;
    }

    // ✅ If no projectName, try to get it from the task data
    async function fetchTask() {
      try {
        setLoadingTask(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        const res = await fetch(`/api/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to load task");
        }
        
        const data = await res.json();
        setTask(data);
        console.log("data in ticket  : ",data)
        setTitle(data.title || "");
        setDescription(data.description || "");
        setMemberIds(data.assignees?.map((assignee) => assignee.user?._id || assignee.user || assignee._id || assignee) || []);
        
        // ✅ Try to get project info from task if projectName is missing
        if (!projectName && data.projectId) {
          console.log("🔄 Fetching project info from task data...");
          fetchProjectFromId(data.projectId, token);
        }
      } catch (e) {
        console.error("❌ Error loading task:", e);
        setError(e.message || "Error loading task");
      } finally {
        setLoadingTask(false);
      }
    }

    async function fetchProjectFromId(projectName, token) {
      try {
        setLoadingParticipants(true);
        const res = await fetch(`/api/projects/${projectName}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          console.log("⚠️ Could not fetch project by ID, skipping participants");
          return;
        }
        
        const project = await res.json();
        const parts = project.participants || [];
        setParticipants(parts);

        const mgrs = parts.filter((p) =>
          ["admin", "manager", "project-manager"].includes(p.roleInProject?.toLowerCase())
        );
        const membs = parts.filter(
          (p) => !["admin", "manager", "project-manager"].includes(p.roleInProject?.toLowerCase())
        );

        setManagers(mgrs);
        setMembers(membs);
      } catch (e) {
        console.error("❌ Error fetching project by ID:", e);
      } finally {
        setLoadingParticipants(false);
      }
    }

    async function fetchParticipants() {
      if (!projectName) {
        console.log("⏭️ Skipping fetchParticipants - no projectName");
        return;
      }

      try {
        setLoadingParticipants(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to load project participants");
        }
        
        const project = await res.json();
        
        const parts = project.participants || [];
        setParticipants(parts);

        const mgrs = parts.filter((p) =>
          ["admin", "manager", "project-manager"].includes(p.roleInProject?.toLowerCase())
        );
        const membs = parts.filter(
          (p) => !["admin", "manager", "project-manager"].includes(p.roleInProject?.toLowerCase())
        );

        setManagers(mgrs);
        setMembers(membs);
      } catch (e) {
        console.error("❌ Error fetching participants:", e);
        setError(e.message);
      } finally {
        setLoadingParticipants(false);
      }
    }

    async function fetchTickets() {
      try {
        setLoadingTickets(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        const res = await fetch(`/api/tasks/${taskId}/tickets`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to load tickets");
        }
        
        const data = await res.json();
        setTickets(data);
      } catch (e) {
        console.error("❌ Error fetching tickets:", e);
        // Don't set error for tickets - it's not critical
      } finally {
        setLoadingTickets(false);
      }
    }

    // ✅ Call fetch functions
    fetchTask();
    if (projectName) {
      fetchParticipants();
    }
    fetchTickets();
  }, [currentUser, taskId, projectName]);

  // ✅ Loading states
  if (loadingUser) {
    return <p className="text-center p-6">Loading user session...</p>;
  }
  
  if (!currentUser) {
    return <p className="text-center p-6">Please log in to continue.</p>;
  }
  
  if (loadingTask) {
    return <p className="text-center p-6">Loading task details...</p>;
  }
  
  if (error) {
    return (
      <div className="text-center p-6">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // ✅ Show warning if no participants loaded
  if (!loadingParticipants && participants.length === 0) {
    console.log("⚠️ No participants loaded. This might affect assignee selection.");
  }

  async function handleTaskSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("Please fill in title and description.");
      return;
    }
    
    setSubmittingTask(true);
    try {
      const token = localStorage.getItem("token");
      
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          memberIds,
          assignedBy: currentUser._id,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");
      toast.success("Task updated!");
      setTask(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingTask(false);
    }
  }

  function handleMemberChange(e) {
    const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setMemberIds(selected);
  }

  function handleNewTicketChange(e) {
    const { name, value } = e.target;
    setNewTicket((prev) => ({ ...prev, [name]: value }));
  }

async function createTicket(e) {
    e.preventDefault();
    if (!newTicket.issueTitle.trim()) {
      setError("Issue title is required");
      return;
    }
    setSubmittingTicket(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTicket),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      const data = await res.json();
      toast.success("Ticket created successfully.");
      setTickets((prev) => [...prev, data.ticket]);
      setNewTicket({
        issueTitle: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        startDate: "",
        dueDate: "",
        tag: "other",
      });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSubmittingTicket(false);
    }
  }


  const canAssignManager = currentUser?.role === "admin";
  const canAssignMembers = ["admin", "manager"].includes(currentUser?.role);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded shadow space-y-6">
      <h1 className="text-2xl font-bold">
        Update Task {projectName ? `- ${projectName}` : ''}
      </h1>

      {/* ✅ Show warning if no participants */}
      {!loadingParticipants && participants.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800">
          ⚠️ No project participants loaded. You may not be able to assign team members.
        </div>
      )}

      {loadingParticipants && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800">
          Loading project participants...
        </div>
      )}

      <form onSubmit={handleTaskSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Title</label>
          <input
            className="border rounded w-full px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Description</label>
          <textarea
            className="border rounded w-full px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Assignees</label>
          <select
            multiple
            className="border rounded w-full px-3 py-2 h-32"
            value={memberIds}
            onChange={handleMemberChange}
            disabled={!canAssignMembers}
          >
            {[...managers, ...members].map((m) => (
              <option key={m.userId || m._id} value={m.userId || m._id}>
                {m.username || m.name || m.email} ({m.roleInProject})
              </option>
            ))}
          </select>
          <small className="text-gray-500 mt-1">
            Hold Ctrl / Cmd to select multiple assignees.
          </small>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={submittingTask}
        >
          {submittingTask ? "Updating task..." : "Update Task"}
        </button>
      </form>

      {/* Tickets Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3">Tickets</h2>

        {loadingTickets && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800">
            Loading tickets...
          </div>
        )}

        {tickets.length === 0 && !loadingTickets && <p>No tickets yet.</p>}

        {tickets.map((t) => (
          <div
            key={t._id || t.id}
            className="border rounded p-4 mb-3 shadow-sm bg-gray-50 dark:bg-gray-800"
          >
            <strong>{t.issueTitle}</strong>{" "}
            <span className="italic text-sm">[{t.status}]</span>
            <p>{t.description}</p>
            <p>
             Assigned to: {t.assignedTo?.username || t.assignedTo?.name || t.assignedTo?.email || t.assignedTo?._id ||"Unassigned"}
            </p>
          </div>
        ))}

        {/* New Ticket Form */}
        <form onSubmit={createTicket} className="mt-6 space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Raise a New Ticket</h3>

          <input
            type="text"
            name="issueTitle"
            placeholder="Issue Title"
            value={newTicket.issueTitle}
            onChange={handleNewTicketChange}
            className="border rounded w-full px-3 py-2"
            required
          />
          
          <textarea
            name="description"
            placeholder="Description"
            rows={3}
            value={newTicket.description}
            onChange={handleNewTicketChange}
            className="border rounded w-full px-3 py-2"
          />

          <select
            name="assignedTo"
            value={newTicket.assignedTo}
            onChange={handleNewTicketChange}
            className="border rounded w-full px-3 py-2"
          >
            <option value="">Assign To (optional)</option>
            {[...managers, ...members].map((p) => (
              <option key={p.userId || p._id} value={p.userId || p._id}>
                {p.username || p.name || p.email} ({p.role})
              </option>
            ))}
          </select>

          <select
            name="priority"
            value={newTicket.priority}
            onChange={handleNewTicketChange}
            className="border rounded w-full px-3 py-2"
            required
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>

          <div className="flex gap-4">
            <label className="flex-1">
              Start Date{" "}
              <input
                type="date"
                name="startDate"
                value={newTicket.startDate}
                onChange={handleNewTicketChange}
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>

            <label className="flex-1">
              Due Date{" "}
              <input
                type="date"
                name="dueDate"
                value={newTicket.dueDate}
                onChange={handleNewTicketChange}
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
          </div>

          <select
            name="tag"
            value={newTicket.tag}
            onChange={handleNewTicketChange}
            className="border rounded w-full px-3 py-2"
          >
            <option value="bug">Bug</option>
            <option value="development">Development</option>
            <option value="other">Other</option>
          </select>

          <button
            type="submit"
            disabled={submittingTicket}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {submittingTicket ? "Creating Ticket..." : "Raise Ticket"}
          </button>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
}
