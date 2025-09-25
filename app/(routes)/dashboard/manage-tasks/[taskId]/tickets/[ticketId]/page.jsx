"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * app/dashboard/manage-tasks/[taskId]/tickets/[ticketId]/page.jsx
 *
 * - Client component for viewing & editing a ticket
 * - Tries GET /api/tasks/:taskId/tickets then falls back to GET /api/tasks/:taskId
 * - Update via PUT /api/tasks/:taskId/tickets with JSON { ticketId, ...updates }
 * - Delete via DELETE /api/tasks/:taskId/tickets/:ticketId
 *
 * Expects JWT in localStorage.token. Redirects to /login when token is missing/invalid.
 */

export default function TicketDetailPage({ params }) {
  const router = useRouter();
  const { taskId, ticketId } = params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);

  const [form, setForm] = useState({
    issueTitle: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    estimatedHours: "",
    tag: "",
    status: "open",
    comments: [],
  });

  const [newCommentText, setNewCommentText] = useState("");

  // Load session role (redirect to login if invalid)
  useEffect(() => {
    async function loadSession() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const res = await fetch("/api/auth/session", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUserRole(data.role || "");
      } catch (err) {
        console.error("session error", err);
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    loadSession();
  }, [router]);

  // Fetch ticket: try tickets endpoint first, then task fallback
  const fetchTicket = useCallback(async () => {
    if (!taskId || !ticketId) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Try tickets list endpoint
      let found = null;
      try {
        const resTickets = await fetch(`/api/tasks/${taskId}/tickets`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (resTickets.ok) {
          const data = await resTickets.json();
          if (Array.isArray(data)) {
            found = data.find((t) => (t._id || t.id) === ticketId);
          }
        } else if (resTickets.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
      } catch (err) {
        console.warn(
          "tickets endpoint failed, will fallback to task fetch",
          err
        );
      }

      // Fallback to fetching task and searching its tickets
      if (!found) {
        const resTask = await fetch(`/api/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!resTask.ok) {
          if (resTask.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          const errJson = await resTask.json().catch(() => ({}));
          throw new Error(
            errJson.error || `Failed to fetch task (status ${resTask.status})`
          );
        }
        const taskData = await resTask.json();
        if (taskData && Array.isArray(taskData.tickets)) {
          found = taskData.tickets.find((t) => (t._id || t.id) === ticketId);
        }
      }

      if (!found) {
        setError("Ticket not found");
        setTicket(null);
        return;
      }

      setTicket(found);
      setForm({
        issueTitle: found.issueTitle || "",
        description: found.description || "",
        assignedTo:
          typeof found.assignedTo === "object"
            ? found.assignedTo._id || found.assignedTo.id || ""
            : found.assignedTo || "",
        priority: found.priority || "medium",
        estimatedHours:
          typeof found.estimatedHours === "number"
            ? String(found.estimatedHours)
            : found.estimatedHours || "",
        tag: found.tag || "",
        status: found.status || "open",
        comments: Array.isArray(found.comments) ? found.comments.slice() : [],
      });
    } catch (err) {
      console.error("fetchTicket error", err);
      setError(err.message || "Failed to load ticket");
      toast.error(err.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [taskId, ticketId, router]);

  useEffect(() => {
    if (userRole) {
      fetchTicket();
    }
  }, [userRole, fetchTicket]);

  // Utility: determine if current user can edit
  function getUserIdFromToken() {
    try {
      const t = localStorage.getItem("token");
      if (!t) return null;
      const payload = t.split(".")[1];
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      );
      return (
        decoded?.id || decoded?._id || decoded?.userId || decoded?.sub || null
      );
    } catch {
      return null;
    }
  }

  const isEditable = () => {
    if (!userRole) return false;
    if (["admin", "manager"].includes(userRole)) return true;
    if (userRole === "member") {
      const uid = getUserIdFromToken();
      const assigned =
        ticket && ticket.assignedTo
          ? typeof ticket.assignedTo === "object"
            ? ticket.assignedTo._id || ticket.assignedTo.id
            : ticket.assignedTo
          : null;
      return !!uid && !!assigned && String(uid) === String(assigned);
    }
    return false;
  };

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Save updates
  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!ticket) return;
    if (!isEditable()) {
      toast.error("You do not have permission to edit this ticket");
      return;
    }
    if (!form.issueTitle || !form.issueTitle.trim()) {
      toast.error("Issue title is required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const estimatedHours =
        form.estimatedHours === "" || form.estimatedHours === null
          ? undefined
          : Number(form.estimatedHours);

      const updates = {
        issueTitle: form.issueTitle.trim(),
        description: form.description?.trim() || "",
        assignedTo: form.assignedTo || null,
        priority: form.priority,
        estimatedHours:
          typeof estimatedHours === "number" && !Number.isNaN(estimatedHours)
            ? estimatedHours
            : undefined,
        tag: form.tag?.trim() || "",
        status: form.status,
        comments: Array.isArray(form.comments) ? form.comments : [],
      };

      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketId: ticket._id || ticket.id, ...updates }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Failed to update ticket (status ${res.status})`
        );
      }

      const updated = await res.json().catch(() => ({}));
      const updatedTicket = updated?.ticket ?? updated ?? null;
      if (updatedTicket) {
        setTicket(updatedTicket);
        setForm((prev) => ({
          ...prev,
          issueTitle: updatedTicket.issueTitle || prev.issueTitle,
          description: updatedTicket.description || prev.description,
          assignedTo:
            typeof updatedTicket.assignedTo === "object"
              ? updatedTicket.assignedTo._id ||
                updatedTicket.assignedTo.id ||
                ""
              : updatedTicket.assignedTo || prev.assignedTo,
          priority: updatedTicket.priority || prev.priority,
          estimatedHours:
            typeof updatedTicket.estimatedHours === "number"
              ? String(updatedTicket.estimatedHours)
              : updatedTicket.estimatedHours ?? prev.estimatedHours,
          tag: updatedTicket.tag || prev.tag,
          status: updatedTicket.status || prev.status,
          comments: Array.isArray(updatedTicket.comments)
            ? updatedTicket.comments
            : prev.comments,
        }));
      }

      toast.success("Ticket updated");
    } catch (err) {
      console.error("update error", err);
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  // Add comment
  const addComment = async () => {
    if (!newCommentText.trim()) return;
    const comment = {
      _id: `local-${Date.now()}`,
      text: newCommentText.trim(),
      createdAt: new Date().toISOString(),
      author: "You",
    };
    // optimistic UI
    setForm((p) => ({ ...p, comments: [...(p.comments || []), comment] }));
    setNewCommentText("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId: ticket._id || ticket.id,
          comments: [...(form.comments || []), comment],
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Failed to add comment (status ${res.status})`
        );
      }
      const updated = await res.json().catch(() => ({}));
      const updatedTicket = updated?.ticket ?? updated ?? null;
      if (updatedTicket) {
        setTicket(updatedTicket);
        setForm((p) => ({
          ...p,
          comments: Array.isArray(updatedTicket.comments)
            ? updatedTicket.comments
            : p.comments,
        }));
      }
      toast.success("Comment added");
    } catch (err) {
      console.error("add comment error", err);
      toast.error(err.message || "Failed to add comment");
      // rollback local optimistic comment
      setForm((p) => ({
        ...p,
        comments: (p.comments || []).filter(
          (c) => !String(c._id).startsWith("local-")
        ),
      }));
    }
  };

  // Delete ticket (admin only)
  const handleDelete = async () => {
    if (!ticket) return;
    if (!confirm("Delete ticket? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(
        `/api/tasks/${taskId}/tickets/${ticket._id || ticket.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Failed to delete ticket (status ${res.status})`
        );
      }
      toast.success("Ticket deleted");
      router.push(`/dashboard/manage-tasks/${taskId}`);
    } catch (err) {
      console.error("delete error", err);
      toast.error(err.message || "Failed to delete ticket");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <Loader2 className="animate-spin w-6 h-6 mr-3 text-gray-500" />
            <span className="text-gray-600">Loading ticket...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 text-red-700 bg-red-100 p-4 rounded">
            {error}
          </div>
          <Button
            onClick={() => router.push(`/dashboard/manage-tasks/${taskId}`)}
          >
            Back to Task
          </Button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-6 rounded border">
          <p className="text-gray-600">Ticket not found</p>
          <Button
            onClick={() => router.push(`/dashboard/manage-tasks/${taskId}`)}
            className="mt-4"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  const editable = isEditable();

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push(`/dashboard/manage-tasks/${taskId}`)}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to task
            </button>

            <h1 className="text-2xl font-bold mt-3 text-gray-900 dark:text-gray-100">
              Ticket #{ticket._id || ticket.id}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {ticket.issueTitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {["admin", "manager"].includes(userRole) && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />{" "}
                {saving ? "Saving..." : "Save"}
              </Button>
            )}

            {userRole === "admin" && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={form.issueTitle}
                  onChange={(e) => setField("issueTitle", e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={!editable || saving}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="w-full p-2 border rounded min-h-[120px]"
                  disabled={!editable || saving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assigned To (userId or email)
                  </label>
                  <input
                    type="text"
                    value={form.assignedTo}
                    onChange={(e) => setField("assignedTo", e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!editable || saving}
                    placeholder="optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!editable || saving}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.estimatedHours}
                    onChange={(e) => setField("estimatedHours", e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!editable || saving}
                    placeholder="optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tag</label>
                  <input
                    type="text"
                    value={form.tag}
                    onChange={(e) => setField("tag", e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!editable || saving}
                    placeholder="optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!editable || saving}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-2">Comments</h4>
                <div className="space-y-3">
                  {(form.comments || []).map((c) => (
                    <div
                      key={c._id || `${c.createdAt}-${c.text}`}
                      className="p-3 bg-gray-50 dark:bg-slate-900 rounded border"
                    >
                      <div className="text-xs text-gray-500">
                        {c.author || "Unknown"} •{" "}
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString("en-IN")
                          : "-"}
                      </div>
                      <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                        {c.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 p-2 border rounded"
                    disabled={saving}
                  />
                  <Button
                    onClick={addComment}
                    disabled={saving || !newCommentText.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div>
                <strong>Ticket ID</strong>{" "}
                <div className="text-xs text-gray-500 mt-1">
                  {ticket._id || ticket.id}
                </div>
              </div>
              <div className="mt-3">
                <strong>Created</strong>{" "}
                <div className="text-xs text-gray-500 mt-1">
                  {ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleString("en-IN")
                    : "-"}
                </div>
              </div>
              <div className="mt-3">
                <strong>Updated</strong>{" "}
                <div className="text-xs text-gray-500 mt-1">
                  {ticket.updatedAt
                    ? new Date(ticket.updatedAt).toLocaleString("en-IN")
                    : "-"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href={`/dashboard/manage-tasks/${taskId}`}>
                <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                  Back to task
                </span>
              </Link>
            </div>
          </div>
        </div>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}
