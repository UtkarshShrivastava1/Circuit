"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

/**
 * Create Ticket Page (also acts as ticket manager for the task)
 *
 * - Lists tickets for the task
 * - Create ticket via modal (POST /api/tasks/:taskId/tickets)
 * - Uses hard-coded dropdowns for enums to avoid Mongoose enum errors
 */

export default function CreateTicketPage() {
  const router = useRouter();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTask, setLoadingTask] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [saving, setSaving] = useState(false);

  // modal / form state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    issueTitle: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    estimatedHours: "",
    tag: "other",
  });

  // Hard-coded enums — keep them in sync with your Mongoose schema
  const ALLOWED_TAGS = ["bug", "development", "other"]; // update if schema changes
  const ALLOWED_PRIORITIES = ["low", "medium", "high", "urgent"]; // update if schema changes

  const fetchSession = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return null;
      }
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem("token");
        router.push("/login");
        return null;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("session fetch error", err);
      localStorage.removeItem("token");
      router.push("/login");
      return null;
    }
  }, [router]);

  const fetchTaskAndTickets = useCallback(async () => {
    if (!taskId) return;
    setLoadingTask(true);
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const [resTask, resTickets] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/tasks/${taskId}/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!resTask.ok) {
        if (resTask.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const err = await resTask.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load task (${resTask.status})`);
      }

      if (!resTickets.ok) {
        if (resTickets.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const err = await resTickets.json().catch(() => ({}));
        throw new Error(
          err.error || `Failed to load tickets (${resTickets.status})`
        );
      }

      const taskBody = await resTask.json();
      const ticketsBody = await resTickets.json();

      setTask(taskBody);
      setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
    } catch (err) {
      console.error("fetchTaskAndTickets error:", err);
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoadingTask(false);
      setLoadingTickets(false);
    }
  }, [taskId, router]);

  useEffect(() => {
    (async () => {
      await fetchSession();
      await fetchTaskAndTickets();
    })();
  }, [fetchSession, fetchTaskAndTickets]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const openModal = () => {
    setForm((f) => ({
      ...f,
      issueTitle: "",
      description: "",
      assignedTo: task?.assignees?.[0]?.user?._id || "",
      priority: "medium",
      estimatedHours: "",
      tag: "other",
    }));
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const createTicket = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    if (!form.issueTitle || !form.issueTitle.trim()) {
      toast.error("Issue Title is required");
      return;
    }

    // Validate priority/tag against allowed lists
    const priority = (form.priority || "medium").toLowerCase();
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      toast.error(
        `Invalid priority. Allowed: ${ALLOWED_PRIORITIES.join(", ")}`
      );
      return;
    }

    const tag = (form.tag || "other").toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) {
      toast.error(`Invalid tag. Allowed: ${ALLOWED_TAGS.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Login required");
        router.push("/login");
        return;
      }

      const payload = {
        issueTitle: form.issueTitle.trim(),
        description: form.description?.trim() || "",
        assignedTo: form.assignedTo ? form.assignedTo : null,
        priority,
        estimatedHours:
          form.estimatedHours !== "" && form.estimatedHours !== null
            ? Number(form.estimatedHours)
            : undefined,
        tag,
      };

      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // attempt to read structured error
        let errText = `Failed to create ticket (${res.status})`;
        try {
          const j = await res.json();
          if (j && (j.error || j.message)) errText = j.error || j.message;
          else errText = JSON.stringify(j);
        } catch (parseErr) {
          try {
            errText = await res.text();
          } catch {}
        }
        throw new Error(errText);
      }

      const body = await res.json().catch(() => ({}));
      const created = body?.ticket || body;
      setTickets((prev) => [created, ...prev]);
      toast.success("Ticket created");
      closeModal();
    } catch (err) {
      console.error("createTicket error", err);
      toast.error(err.message || "Validation failed");
    } finally {
      setSaving(false);
    }
  };

  if (loadingTask && loadingTickets) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!task) {
    return <div className="mt-6 text-center text-red-500">Task not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/manage-tasks/${taskId}/open`)
              }
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h1 className="text-2xl font-bold mt-3 text-gray-900 dark:text-white">
              Tickets — {task.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {task.projectId?.name || task.projectName || ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={openModal} className="inline-flex items-center">
              <PlusIconFallback className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        </div>

        {/* Tickets list */}
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 text-center">
              <p className="text-gray-600">No tickets for this task yet.</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const tid = ticket._id || ticket.id;
              return (
                <div
                  key={tid}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between"
                >
                  <div className="max-w-[70%]">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {ticket.issueTitle}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {ticket.description || "No description"}
                    </p>

                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                      <div>
                        <strong>Priority:</strong>{" "}
                        <span className="capitalize">
                          {ticket.priority || "medium"}
                        </span>
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span className="capitalize">
                          {ticket.status || "open"}
                        </span>
                      </div>
                      <div>
                        <strong>Assigned:</strong>{" "}
                        {ticket.assignedTo
                          ? ticket.assignedTo.name ||
                            ticket.assignedTo.email ||
                            ticket.assignedTo
                          : "Unassigned"}
                      </div>
                      <div>
                        <strong>Tag:</strong> {ticket.tag || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created:{" "}
                      {ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleString("en-IN")
                        : "-"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Ticket
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Issue Title *
                </label>
                <input
                  name="issueTitle"
                  value={form.issueTitle}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assigned To
                  </label>
                  {task &&
                  Array.isArray(task.assignees) &&
                  task.assignees.length > 0 ? (
                    <select
                      name="assignedTo"
                      value={form.assignedTo || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="">-- Unassigned --</option>
                      {task.assignees.map((a) => {
                        const id = a?.user?._id || a?.user;
                        const label =
                          a?.user?.name || a?.user?.email || String(id);
                        return (
                          <option key={String(id)} value={String(id)}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      name="assignedTo"
                      value={form.assignedTo}
                      onChange={handleChange}
                      className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="user id or email (optional)"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {ALLOWED_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Estimated Hours
                  </label>
                  <input
                    name="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.estimatedHours}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="e.g. 1.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tag</label>
                  <select
                    name="tag"
                    value={form.tag}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {ALLOWED_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Creating...
                    </>
                  ) : (
                    "Create Ticket"
                  )}
                </Button>

                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}

/**
 * Small fallback component because I used Plus icon earlier in snippets.
 * Replace with <Plus /> import from lucide-react if you already have it.
 */
function PlusIconFallback(props) {
  return (
    <svg
      {...props}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
