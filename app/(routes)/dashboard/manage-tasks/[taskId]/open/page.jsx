"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import Checklist from "../../../_components/CheckList";

export default function TaskDetailPage() {
  const router = useRouter();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);

  const openDeleteModal = (taskId) => {
    setPendingDeleteTaskId(taskId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDeleteTaskId(null);
  };

  async function handleDeleteTask() {
    if (!pendingDeleteTaskId) return;
    setDeleting(true);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${pendingDeleteTaskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete task");
        return;
      }
      toast.success("Task deleted successfully");
      router.push("/dashboard/manage-tasks");
    } catch (err) {
      toast.error("Network error deleting task");
      console.error(err);
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  }

  useEffect(() => {
    async function fetchUserAndTask() {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      try {
        const [resUser, resTask] = await Promise.all([
          fetch("/api/auth/session", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!resUser.ok || !resTask.ok) throw new Error("Failed to load data");
        const userData = await resUser.json();
        const taskData = await resTask.json();
        setUserRole(userData.role);
        setTask(taskData);
        console.log("Task Data ", taskData);
        setStatus(taskData.status || "pending");
      } catch (error) {
        toast.error(error.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    if (taskId) fetchUserAndTask();
  }, [taskId, router]);

  async function handleStatusSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      toast.success("Status updated");
      setTask((prev) => ({ ...prev, status }));
    } catch (error) {
      toast.error(error.message || "Failed to save status");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleChecklist(itemId, isCompleted) {
    if (!task) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");

      const res = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isCompleted }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update checklist item");
      }

      setTask((prev) => {
        const newChecklist = prev.checklist.map((item) =>
          item._id === itemId ? { ...item, isCompleted } : item
        );
        return { ...prev, checklist: newChecklist };
      });
      toast.success("Checklist item updated");
    } catch (e) {
      toast.error(e.message || "Failed to update checklist");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!task)
    return <div className="mt-6 text-center text-red-500">Task not found</div>;

  const goToCreateTicket = () => {
    router.push(`/dashboard/manage-tasks/${task._id}/create-ticket`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 rounded-xl bg-white dark:bg-slate-900 shadow-md sm:p-8 sm:mt-6">
      {/* <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      /> */}

      {/* Header: title + create button */}
      <div className="flex items-start justify-between mb-6">
        <div className="pr-4 flex-1">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white break-words">
            {task.title}
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {task.projectId?.name || task.projectName || ""}
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-3">
          <button
            onClick={() => router.push("/dashboard/manage-tasks")}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
            aria-label="Back to tasks"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={goToCreateTicket}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2"
            aria-label="Create ticket"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </button>
        </div>
      </div>

      {/* <ProgressBar value={task.progress} /> */}

      <section className="mb-8">
        <Checklist
          checklist={task?.checklist ?? []}
          onToggle={onToggleChecklist}
        />
      </section>

      {/* Status Section */}
      {userRole === "member" ? (
        <div className="mb-6 max-w-md">
          <label
            htmlFor="status"
            className="block mb-2 font-semibold text-gray-700 dark:text-gray-300"
          >
            Status
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
              className="w-full sm:w-48 px-4 py-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="ongoing">Ongoing</option>
              <option value="deployment">Deployment</option>
              <option value="completed">Completed</option>
            </select>
            <button
              onClick={handleStatusSave}
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition"
            >
              {saving ? (
                <Loader2 className="animate-spin inline mr-2 h-5 w-5" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-6 max-w-md text-gray-800 dark:text-gray-200">
          <strong className="text-gray-700 dark:text-gray-300">Status:</strong>{" "}
          <span className="capitalize">{task.status || "pending"}</span>
        </p>
      )}

      {/* Description */}
      <section className="mb-8 max-w-3xl">
        <h2 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Description
        </h2>
        <p className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap">
          {task.description || "-"}
        </p>
      </section>

      {/* Assignees */}
      <section className="mb-8 max-w-md">
        <h2 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Assignees
        </h2>
        {task.assignees && task.assignees.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-gray-900 dark:text-gray-200">
            {task.assignees.map((a) => (
              <li key={a?.user?._id || a?._id} className="truncate">
                {a?.user?.name || a?.user?.email || "Unknown User"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No assignees</p>
        )}
      </section>

      {/* Task Metadata */}
      <section className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg text-gray-700 dark:text-gray-300">
        <div>
          <span className="font-semibold">Priority:</span>{" "}
          <span className="capitalize">{task.priority || "N/A"}</span>
        </div>
        <div>
          <span className="font-semibold">Progress:</span> {task.progress ?? 0}%
        </div>
        <div>
          <span className="font-semibold">Created at:</span>{" "}
          {task.createdAt ? new Date(task.createdAt).toLocaleString() : "-"}
        </div>
        <div>
          <span className="font-semibold">Updated at:</span>{" "}
          {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "-"}
        </div>
      </section>

      {/* Edit/Delete Buttons for non-members */}
      {userRole !== "member" && (
        <div className="flex flex-wrap gap-4 justify-start">
          <button
            onClick={() =>
              router.push(
                `/dashboard/manage-tasks/${
                  task._id
                }/update?projectName=${encodeURIComponent(task.projectId)}`
              )
            }
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Edit
          </button>
          <button
            onClick={() => openDeleteModal(task._id)}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center"
          >
            {deleting ? (
              <>
                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-red-600 mb-4">
              Confirm Delete
            </h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
