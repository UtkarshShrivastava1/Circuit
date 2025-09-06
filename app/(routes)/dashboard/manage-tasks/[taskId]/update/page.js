'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

export default function TaskUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId;
  const projectName = params.projectId || params.project;

  const [currentUser, setCurrentUser] = useState(null);
  const [task, setTask] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [memberIds, setMemberIds] = useState([]);

  const [tickets, setTickets] = useState([]);
  const [newTicket, setNewTicket] = useState({
    issueTitle: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    estimatedHours: 0,
    tag: 'other',
  });


  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [error, setError] = useState('');

  // Confirmation modal state variables
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
 
   // Open confirmation modal for delete
  function confirmDeleteTicket(ticketId) {
    setTicketToDelete(ticketId);
    setShowDeleteModal(true);
  }

    // Cancel the delete modal
  // const handleDeleteCancel = () => {
  //   setShowDeleteModal(false);
  //   setTicketToDelete(null);
  //   setDeleteError('');
  // };



  // ✅ Fetch current user session
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setLoadingUser(true);
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const userData = await res.json();
        setCurrentUser(userData);
      } catch (e) {
        router.push('/login');
      } finally {
        setLoadingUser(false);
      }
    }
    fetchCurrentUser();
  }, [router]);

  // ✅ Load task, participants (if possible), and tickets
  useEffect(() => {
    if (!currentUser || !taskId) return;

    async function fetchTask() {
      try {
        setLoadingTask(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        const res = await fetch(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to load task');
        }
        const data = await res.json();
        setTask(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setMemberIds(
          data.assignees?.map((assignee) => assignee.user?._id || assignee.user || assignee._id || assignee) || []
        );
        if (!projectName && data.projectId) {
          fetchProjectFromId(data.projectId, token);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingTask(false);
      }
    }

    async function fetchProjectFromId(projectName, token) {
      try {
        setLoadingParticipants(true);
        const res = await fetch(`/api/projects/${projectName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const project = await res.json();
        const parts = project.participants || [];
        setParticipants(parts);
        const mgrs = parts.filter((p) =>
          ['admin', 'manager', 'project-manager'].includes(p.roleInProject?.toLowerCase())
        );
        const membs = parts.filter(
          (p) => !['admin', 'manager', 'project-manager'].includes(p.roleInProject?.toLowerCase())
        );
        setManagers(mgrs);
        setMembers(membs);
      } catch (e) {
        console.error('Error fetching project by ID:', e);
      } finally {
        setLoadingParticipants(false);
      }
    }

    async function fetchParticipants() {
      if (!projectName) return;
      try {
        setLoadingParticipants(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to load participants');
        }
        const project = await res.json();
        const parts = project.participants || [];
        setParticipants(parts);
        const mgrs = parts.filter((p) =>
          ['admin', 'manager', 'project-manager'].includes(p.roleInProject?.toLowerCase())
        );
        const membs = parts.filter(
          (p) => !['admin', 'manager', 'project-manager'].includes(p.roleInProject?.toLowerCase())
        );
        setManagers(mgrs);
        setMembers(membs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingParticipants(false);
      }
    }

    async function fetchTickets() {
      try {
        setLoadingTickets(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        const res = await fetch(`/api/tasks/${taskId}/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to load tickets");
        }
        const data = await res.json();
        setTickets(data);
        // console.log("Fetched tickets:", data);
      } catch (e) {
        console.error('Error fetching tickets:', e);
      } finally {
        setLoadingTickets(false);
      }
    }

    fetchTask();
    if (projectName) {
      fetchParticipants();
    }
    fetchTickets();
  }, [currentUser, taskId, projectName, router]);

  // Loading and error states
  if (loadingUser)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
    );
  if (!currentUser)
    return (
      <div className="p-6 text-center text-gray-900 dark:text-gray-200">
        Please log in to continue.
      </div>
    );
  if (loadingTask)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
    );
  if (error)
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <p className="mb-4">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </Button>
      </div>
    );

  // Helper function for member/manager selection
  const renderParticipantOption = (p) => (
    <option
      key={p.userId || p._id}
      value={p.userId || p._id}
      className="text-gray-900 dark:text-gray-200"
    >
      {p.username || p.name || p.email} ({p.roleInProject})
    </option>
  );

  // Update task handler
  async function handleTaskSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !description.trim()) {
      setError('Please fill in title and description.');
      return;
    }
    setSubmittingTask(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          memberIds,
          assignedBy: currentUser._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');
      toast.success('Task updated!');
      setTask(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingTask(false);
    }
  }

  // Member select handler
  function handleMemberChange(e) {
    const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setMemberIds(selected);
  }

  // Ticket input change handler
  function handleNewTicketChange(e) {
    const { name, value } = e.target;
    setNewTicket((prev) => ({ ...prev, [name]: value }));
  }

  // Create ticket handler
  async function createTicket(e) {
    e.preventDefault();
    if (!newTicket.issueTitle.trim()) {
      setError('Issue title is required');
      return;
    }
    setSubmittingTicket(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const data = await res.json();
      toast.success('Ticket created successfully.');
      setTickets((prev) => [...prev, data.ticket]);
      setNewTicket({
        issueTitle: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        startDate: '',
        dueDate: '',
        tag: 'other',
      });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSubmittingTicket(false);
    }
  }



// Confirm deletion handler
  async function handleDeleteConfirm() {
    if (!ticketToDelete) return;
    setDeletingTicket(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`/api/tasks/${taskId}/tickets/${ticketToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(`Failed to delete: ${data?.error || 'Unknown error'}`);
        setDeletingTicket(false);
        return;
      }
      toast.success('Ticket deleted successfully.');
      setTickets((prev) => prev.filter((t) => t._id !== ticketToDelete && t.id !== ticketToDelete));
      setShowDeleteModal(false);
      setTicketToDelete(null);
    } catch (err) {
      setDeleteError('Network error deleting the ticket.');
      toast.error(err.message);
    } finally {
      setDeletingTicket(false);
    }
  }

function handleDeleteCancel() {
  setShowDeleteModal(false);
  setTicketToDelete(null);
}

  const switchTab = (tab) => setActiveTab(tab);



  const canAssignManager = currentUser?.role === 'admin';
  const canAssignMembers = ['admin', 'manager'].includes(currentUser?.role);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md space-y-8">
        
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-200">
        {projectName ? `Manage Task – ${projectName}` : 'Manage Task'}
      </h1>

      {/* Warning if participants not loaded */}
      {!loadingParticipants && participants.length === 0 && (
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
          No team members found. You may be unable to assign.
        </div>
      )}

      {/* Loading participants */}
      {loadingParticipants && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
          Loading team members...
        </div>
      )}

        <div className="flex border-b border-gray-300 dark:border-slate-700 mb-6">
        <button
          className={`px-4 pb-2 font-semibold text-sm sm:text-base transition-colors ${
            activeTab === 'tasks' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`} onClick={() => switchTab('tasks')}>Tasks</button>
        <button
          className={`px-4 pb-2 font-semibold text-sm sm:text-base transition-colors ${
            activeTab === 'tickets' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`} onClick={() => switchTab('tickets')}>Tickets</button>
      </div>

      {/* Error message */}
      {error && <p className="text-justify text-red-600 dark:text-red-400">{error}</p>}

      {/* Task form */}
     { activeTab === 'tasks' && (
      <>
   
      <form onSubmit={handleTaskSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assignees (hold Ctrl for multiple)
          </label>
          <select
            multiple
            value={memberIds}
            onChange={handleMemberChange}
            disabled={!canAssignMembers}
            className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32"
          >
            {[...managers, ...members].map(renderParticipantOption)}
          </select>
        </div>
        <Button
          type="submit"
          disabled={submittingTask}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg disabled:opacity-70"
        >
          {submittingTask ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5 inline" />
              Updating...
            </>
          ) : (
            'Update Task'
          )}
        </Button>
      </form>
      </>
      
    
    )}

      {/* Tickets section */}
     {activeTab === 'tickets' && ( <div className="mt-8">
            {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-600">Delete Ticket</h3>
                <button
                  onClick={handleDeleteCancel}
                  aria-label="Close"
                  className="text-gray-100 hover:text-gray-900 p-1 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to delete this ticket? This action cannot be undone.
              </p>
              {deleteError && (
                <p className="text-red-600 dark:text-red-400 mb-4">{deleteError}</p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingTicket}
                  className={`px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-70 ${
                    deletingTicket ? 'cursor-not-allowed hover:bg-red-600' : ''
                  }`}
                >
                  {deletingTicket ? (
                    <Loader2 className="animate-spin mr-2 inline" />
                  ) : (
                    'Confirm Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-4">Tickets</h2>
        {loadingTickets && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg">
            Loading tickets...
          </div>
        )}
        {tickets.length === 0 && !loadingTickets && (
          <p className="text-center text-gray-500 dark:text-gray-400">No tickets found.</p>
        )}
    { tickets.length != 0 && !loadingTickets && (<table className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-md overflow-hidden">
  <thead className="bg-gray-100 dark:bg-gray-800">
    <tr>
      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Title</th>
      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Assigned To</th>
      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Action</th>
    </tr>
  </thead>
  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
    {tickets.map((ticket) => (
      <tr key={ticket._id || ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
        <td className="px-6 py-4 whitespace-normal text-gray-900 dark:text-gray-100 font-semibold">{ticket.issueTitle}</td>
        <td className="px-6 py-4 whitespace-normal text-gray-700 dark:text-gray-300">
          {ticket.assignedTo?.username || ticket.assignedTo?.name || ticket.assignedTo?.email || 'Unassigned'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={() => confirmDeleteTicket(ticket._id || ticket.id)}
            className="inline-block px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition"
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
      </table>)}



        {/* New ticket form */}
        <form onSubmit={createTicket} className="mt-6 border-t pt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Raise New Ticket</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issue Title (required)
            </label>
            <input
              type="text"
              name="issueTitle"
              value={newTicket.issueTitle}
              onChange={handleNewTicketChange}
              className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={newTicket.description}
              onChange={handleNewTicketChange}
              rows={3}
              className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assign To
            </label>
            <select
              name="assignedTo"
              value={newTicket.assignedTo}
              onChange={handleNewTicketChange}
              className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select (optional)</option>
              {[...managers, ...members].map(renderParticipantOption)}
            </select>
          </div>
         
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
               EstimatedHours
              </label>
              <input
                type="Number"
                min={0}
                name="estimatedHours"
                value={newTicket.estimatedHours}
                onChange={handleNewTicketChange}
                className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

             <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={newTicket.priority}
              onChange={handleNewTicketChange}
              required
              className="w-[100%] px-4 py-[2.5%] text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
           
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tag
            </label>
            <select
              name="tag"
              value={newTicket.tag}
              onChange={handleNewTicketChange}
              className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bug">Bug</option>
              <option value="development">Development</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Button
            type="submit"
            disabled={submittingTicket}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg disabled:opacity-70"
          >
            {submittingTicket ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5 inline" />
                Creating...
              </>
            ) : (
              'Raise Ticket'
            )}
          </Button>
        </form>
      </div>)}

      <ToastContainer />
    </div>
  );
}
