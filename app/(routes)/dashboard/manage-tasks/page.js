'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

function ManageAllTasks() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');

  const userId = searchParams.get('userId') || '';
  const projectName = searchParams.get('projectName') || '';

  useEffect(() => {
    async function fetchUserRole() {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');
      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUserRole((await res.json()).role);
      else router.push('/login');
    }
    fetchUserRole();
  }, [router]);

  useEffect(() => {
    async function fetchUserAndTasks() {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');
      try {
        // Fetch user session and role
        const resUser = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resUser.ok) return router.push('/login');
        const user = await resUser.json();
        setUserRole(user.role);

        // Build API URL with optional projectName filter
        let apiUrl = '/api/tasks';
        if (projectName && projectName.trim() !== '') {
          apiUrl += `?projectId=${encodeURIComponent(projectName)}`;
        }

        // Fetch tasks
        const resTasks = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resTasks.ok) {
          setError('Failed to load tasks');
          return;
        }
        const tasksData = await resTasks.json();
        setTasks(tasksData);
        setError('');
        // Extract all tickets from tasks
        const allTickets = tasksData.flatMap((task) => task.tickets || []);
        setTickets(allTickets);
      } catch (error) {
        setError('Failed to load data');
      } finally {
        setTasksLoading(false);
        setTicketsLoading(false);
      }
    }
    fetchUserAndTasks();
  }, [router, projectName]);

  const switchTab = (tab) => setActiveTab(tab);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-white dark:bg-slate-950">
      {/* Tabs navigation */}
      <div className="flex border-b border-gray-300 dark:border-slate-700 mb-6">
        <button
          onClick={() => switchTab('tasks')}
          className={`px-4 pb-2 font-semibold text-sm sm:text-base transition-colors ${
            activeTab === 'tasks'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => switchTab('tickets')}
          className={`px-4 pb-2 font-semibold text-sm sm:text-base transition-colors ${
            activeTab === 'tickets'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          Tickets
        </button>
      </div>

      {/* Loading/Error states */}
      {error && (
        <div className="mb-6 p-4 rounded bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tasks table */}
      {activeTab === 'tasks' && (
        <>
          {tasksLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-slate-400 rounded bg-gray-50 dark:bg-slate-800/50">
              No tasks found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-slate-700 shadow-sm">
              <table className="w-full table-auto">
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
                  {tasks.map((task) => (
                    <tr
                      key={task._id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 text-gray-900 dark:text-slate-100">{task.title}</td>
                      <td className="p-3 text-gray-900 dark:text-slate-100">
                        {task.manager?.email || '-'}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-slate-100">
                        {(task.assignees || [])
                          .filter(Boolean)
                          .map((a) => a.user?.email || a.user?.name || '')
                          .join(', ') || '-'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            task?.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                          }`}
                        >
                          {task?.status?.charAt(0).toUpperCase() + task?.status?.slice(1) || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(`/dashboard/manage-tasks/${task._id}/open`)
                          }
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tickets list */}
      {activeTab === 'tickets' && (
        <>
          {ticketsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-slate-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-slate-400 rounded bg-gray-50 dark:bg-slate-800/50">
              No tickets found.
            </div>
          ) : (
            <ul className="space-y-3">
              {tickets.map((ticket) => (
                <li
                  key={ticket?._id}
                  className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    {ticket.issueTitle}
                  </h3>
                  <p className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-medium text-gray-700 dark:text-slate-300">Status:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket?.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {ticket?.status?.charAt(0).toUpperCase() + ticket?.status?.slice(1) || 'Open'}
                    </span>
                  </p>
                  <p className="text-gray-700 dark:text-slate-300 mb-2">
                    <span className="font-medium">Description:</span>
                    <span className="ml-1">{ticket.description || '-'}</span>
                  </p>
                  <p className="text-gray-700 dark:text-slate-300 mb-1">
                    <span className="font-medium">Priority:</span>{' '}
                    {ticket.priority?.charAt(0).toUpperCase() + ticket.priority?.slice(1) || '-'}
                  </p>
                  <p className="text-gray-700 dark:text-slate-300">
                    <span className="font-medium">Assigned to:</span>{' '}
                    {ticket.assignees?.length > 0
                      ? ticket.assignees
                          .filter(Boolean)
                          .map((assignee, idx) => (
                            <span key={idx} className="inline-block">
                              {assignee.user?.username || assignee.user?.email || assignee.user?.name || 'Unknown'}
                              {idx < ticket.assignees.length - 1 ? ', ' : ''}
                            </span>
                          ))
                      : ticket.assignedTo?.username || ticket.assignedTo?.email || 'Unassigned'}
                  </p>
                  <p className="text-gray-700 dark:text-slate-300 mt-2">
                    <span className="font-medium">Start:</span>{' '}
                    {ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : '-'}
                  </p>
                  <p className="text-gray-700 dark:text-slate-300">
                    <span className="font-medium">Due:</span>{' '}
                    {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '-'}
                  </p>
                  <p className="text-gray-700 dark:text-slate-300">
                    <span className="font-medium">Tag:</span> {ticket.tag || '-'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default ManageAllTasks;
