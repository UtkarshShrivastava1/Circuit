'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

function ManageAllTasks() {
  const router = useRouter();
  const params = useParams();
  const {taskId} = params; // Ensure this exists
  // console.log('Task ID from params:', taskId);
  const searchParams = useSearchParams();
  const taskIdfromserchaParam = searchParams.get('taskId');
//  console.log('Task ID from search params:', taskIdfromserchaParam);
  const projectName = searchParams.get('projectName') || '';

  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [deleteError, setDeleteError] = useState('');
//user checking
  useEffect(() => {
    async function fetchUserRole() {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');

      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
      } else {
        router.push('/login');
      }
    }
    fetchUserRole();
  }, [router]);

  //task data fetchnig
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');

      try {
        setTasksLoading(true);
        setTicketsLoading(true);

        // Fetch tasks, with optional project filter
        let apiUrl = '/api/tasks';
        if (projectName.trim()) {
          apiUrl += `?projectId=${encodeURIComponent(projectName)}`;
        }

        const resTasks = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!resTasks.ok) {
          setError('Failed to load tasks');
          return;
        }

        const tasksData = await resTasks.json();
        setTasks(tasksData);
        console.log('task data : ',tasksData)
        setError('');

        // Extract tickets from all tasks
        const allTickets = tasksData.flatMap(task => task.tickets || []);
        setTickets(allTickets);
        console.log('Fetched tickets:', allTickets);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setTasksLoading(false);
        setTicketsLoading(false);
      }
    }
    fetchData();
  }, [router, projectName]);

  const switchTab = (tab) => setActiveTab(tab);

  // Show confirmation modal
  function confirmDeleteTicket(id) {
    setTicketToDelete(id);
    setShowDeleteModal(true);
  }

  // Cancel deletion
  function handleDeleteCancel() {
    setShowDeleteModal(false);
    setTicketToDelete(null);
    setDeleteError('');
  }

  // Confirm deletion and call API
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

      // NOTE: Use taskId and ticketToDelete here
      const res = await fetch(`/api/ticket/${ticketToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error || 'Failed to delete ticket');
        setDeletingTicket(false);
        return;
      }

      toast.success('Ticket deleted successfully');
      setTickets(prev => prev.filter(t => t._id !== ticketToDelete && t.id !== ticketToDelete));
      setShowDeleteModal(false);
      setTicketToDelete(null);
    } catch (err) {
      setDeleteError('Network error deleting ticket');
      toast.error(err.message);
    } finally {
      setDeletingTicket(false);
    }
  }

  

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-white dark:bg-slate-950">
      {/* Tabs */}
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

      {error && <div className="mb-6 p-4 rounded bg-red-100 dark:bg-red-900/20 text-red-700">{error}</div>}

      {/* Tasks Table */}
      {activeTab === 'tasks' && (
        <>
          {tasksLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No tasks found.</div>
          ) : (
            <table className="w-full table-auto overflow-auto rounded border border-gray-300 dark:border-slate-700 shadow-sm">
              <thead className="bg-gray-100 dark:bg-slate-800">
                <tr className="text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                  <th className="p-3">Title</th>
                  <th className="p-3">Manager</th>
                  <th className="p-3">Members</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-slate-700">
                {tasks.map(task => (
                  <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">{task.title}</td>
                    <td className="p-3">{task.manager?.email || '-'}</td>
                    <td className="p-3">
                      {(task.assignees || [])
                        .filter(Boolean)
                        .map(a => a.user?.email || a.user?.name || '')
                        .join(', ') || '-'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                      }`}>{task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : 'Pending'}</span>
                    </td>
                    <td className="p-3">
                      <Button size="sm" onClick={() => router.push(`/dashboard/manage-tasks/${task._id}/open`)}>Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Tickets List */}
      {activeTab === 'tickets' && (
        <>
          {ticketsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No tickets found.</div>
          ) : (
            <ul className="space-y-3">
              {tickets.map(ticket => (
                <li key={ticket._id} className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <h3 className="font-semibold text-lg mb-1">{ticket.issueTitle}</h3>
                  <p className="text-sm mb-2">
                    Status: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ticket.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                    }`}>{ticket.status ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1) : 'Open'}</span>
                  </p>
                  <p className="mb-2">Description: {ticket.description || '-'}</p>
                  <p className="mb-1">Priority: {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : '-'}</p>
                  <p>Assigned to: {ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.username || ticket.assignedTo.email : 'Unassigned'}</p>
                  <p>Tag: {ticket.tag || '-'}</p>
                  <div className="text-sm bg-red-600 text-white dark:text-gray-300 mt-3 px-3 py-1 rounded inline-block">
                    <button onClick={() => confirmDeleteTicket(ticket._id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-red-600">Delete Ticket</h3>
              <button onClick={handleDeleteCancel} aria-label="Close" className="text-gray-100 hover:text-gray-900 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete this ticket? This action cannot be undone.</p>
            {deleteError && <p className="mb-4 text-red-600 dark:text-red-400">{deleteError}</p>}
            <div className="flex justify-end space-x-3">
              <button onClick={handleDeleteCancel} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deletingTicket} className={`px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 ${deletingTicket ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {deletingTicket ? <Loader2 className="inline mr-2 h-5 w-5 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}

export default ManageAllTasks;
