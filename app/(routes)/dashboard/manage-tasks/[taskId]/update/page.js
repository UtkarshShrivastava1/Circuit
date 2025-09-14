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
  const projectName = params.projectId || params.projectName;
  
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
    assignedTo: [],  // ✅ Changed to array for multiple selection
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

  // ✅ Enhanced checkbox handler for task assignees
  function handleMemberCheckboxChange(memberId) {
    setMemberIds(prevIds => {
      const cleanIds = [...new Set(prevIds)]; // Remove duplicates first
      
      if (cleanIds.includes(memberId)) {
        return cleanIds.filter(id => id !== memberId);
      } else {
        return [...cleanIds, memberId];
      }
    });
  }

  // ✅ NEW: Checkbox handler for ticket assignees (multiple selection)
  function handleTicketAssigneeChange(participantId) {
    setNewTicket(prev => {
      const currentAssignees = Array.isArray(prev.assignedTo) ? prev.assignedTo : [];
      const cleanAssignees = [...new Set(currentAssignees)]; // Remove duplicates
      
      if (cleanAssignees.includes(participantId)) {
        // Remove if already selected
        return {
          ...prev,
          assignedTo: cleanAssignees.filter(id => id !== participantId)
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          assignedTo: [...cleanAssignees, participantId]
        };
      }
    });
  }

  // ✅ FIXED: Get truly unique participants
  function getUniqueParticipants() {
    // Use Map to ensure uniqueness by ID
    const participantMap = new Map();
    
    [...managers, ...members].forEach(participant => {
      const id = participant.userId || participant._id;
      if (id && !participantMap.has(id)) {
        participantMap.set(id, participant);
      }
    });
    
    const uniqueParticipants = Array.from(participantMap.values());
    
    // Debug logging
    console.log('Managers:', managers.length);
    console.log('Members:', members.length);
    console.log('Combined total:', [...managers, ...members].length);
    console.log('Unique participants:', uniqueParticipants.length);
    console.log('Selected memberIds:', memberIds);
    
    return uniqueParticipants;
  }

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
        
        // ✅ Clean up memberIds to remove duplicates
        const assigneeIds = data.assignees?.map((assignee) => assignee.user?._id || assignee.user || assignee._id || assignee) || [];
        const uniqueAssigneeIds = [...new Set(assigneeIds.filter(id => id))]; // Remove nulls and duplicates
        setMemberIds(uniqueAssigneeIds);
        
        // Fix: Extract the actual project identifier
        if (!projectName && data.projectId) {
          let actualProjectId;
          if (typeof data.projectId === 'object' && data.projectId !== null) {
            actualProjectId = data.projectId._id || data.projectId.name || data.projectId.projectName || data.projectId.id;
          } else {
            actualProjectId = data.projectId;
          }
          
          if (actualProjectId) {
            console.log('Fetching project with ID:', actualProjectId);
            fetchProjectFromId(actualProjectId, token);
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingTask(false);
      }
    }

    // ✅ FIXED: fetchProjectFromId with better duplicate prevention
    async function fetchProjectFromId(projectIdentifier, token) {
      try {
        setLoadingParticipants(true);
        
        if (!projectIdentifier || typeof projectIdentifier !== 'string') {
          console.error('Invalid project identifier:', projectIdentifier);
          return;
        }
        
        const res = await fetch(`/api/projects/${encodeURIComponent(projectIdentifier)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          console.error('Failed to fetch project:', res.status, res.statusText);
          return;
        }
        
        const project = await res.json();
        const parts = project.participants || [];
        
        // ✅ Use Map for better deduplication
        const uniqueParticipantsMap = new Map();
        parts.forEach(participant => {
          const id = participant.userId || participant._id;
          if (id) {
            uniqueParticipantsMap.set(id, participant);
          }
        });
        
        const uniqueParticipants = Array.from(uniqueParticipantsMap.values());
        setParticipants(uniqueParticipants);
        
        const mgrs = uniqueParticipants.filter((p) =>
          ['admin', 'manager', 'project-manager'].includes(p.roleInProject?.toLowerCase())
        );
        const membs = uniqueParticipants.filter(
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

    // ✅ FIXED: fetchParticipants with better duplicate prevention
    async function fetchParticipants() {
      if (!projectName){
         console.log('No projectName available:', projectName);
         return;
      }
      
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
        
        // ✅ Use Map for better deduplication
        const uniqueParticipantsMap = new Map();
        parts.forEach(participant => {
          const id = participant.userId || participant._id;
          if (id) {
            uniqueParticipantsMap.set(id, participant);
          }
        });
        
        const uniqueParticipants = Array.from(uniqueParticipantsMap.values());
        setParticipants(uniqueParticipants);
        
        const mgrs = uniqueParticipants.filter((p) =>
          ['admin', 'manager', 'project-manager'].includes(p.roleInProject?.toLowerCase())
        );
        const membs = uniqueParticipants.filter(
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
      
      // ✅ Clean memberIds before sending
      const cleanMemberIds = [...new Set(memberIds.filter(id => id))];
      
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          memberIds: cleanMemberIds,
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

  // ✅ UPDATED: Ticket input change handler for non-checkbox inputs
  function handleNewTicketChange(e) {
    const { name, value } = e.target;
    if (name !== 'assignedTo') {  // Don't handle assignedTo here, it's handled by checkbox
      setNewTicket((prev) => ({ ...prev, [name]: value }));
    }
  }

  // ✅ UPDATED: Create ticket handler with multiple assignees support
  async function createTicket(e) {
    e.preventDefault();
    if (!newTicket.issueTitle.trim()) {
      setError('Issue title is required');
      return;
    }
    setSubmittingTicket(true);
    try {
      const token = localStorage.getItem('token');
      
      // ✅ Handle multiple assignees or single assignee based on your API
      const ticketData = {
        ...newTicket,
        assignedTo: Array.isArray(newTicket.assignedTo) && newTicket.assignedTo.length > 0 
          ? newTicket.assignedTo  // If API expects single assignee, use first one
          : newTicket.assignedTo.length > 0 ? newTicket.assignedTo : ''  // Or empty if none selected
      };
      
      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ticketData),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const data = await res.json();
      toast.success('Ticket created successfully.');
      setTickets((prev) => [...prev, data.ticket]);
      setNewTicket({
        issueTitle: '',
        description: '',
        assignedTo: [], // ✅ Reset to empty array
        priority: 'medium',
        estimatedHours: 0,
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
          }`} 
          onClick={() => switchTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={`px-4 pb-2 font-semibold text-sm sm:text-base transition-colors ${
            activeTab === 'tickets' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`} 
          onClick={() => switchTab('tickets')}
        >
          Tickets
        </button>
      </div>

      {/* Error message */}
      {error && <p className="text-justify text-red-600 dark:text-red-400">{error}</p>}

      {/* Task form */}
      {activeTab === 'tasks' && (
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
            
            {/* ✅ FIXED: Task Assignees with proper duplicate prevention */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Assignees
              </label>
              <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 max-h-64 overflow-y-auto">
                {(() => {
                  const uniqueParticipants = getUniqueParticipants();

                  if (uniqueParticipants.length === 0) {
                    return <p className="text-gray-500 dark:text-gray-400 text-sm">No team members available</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {uniqueParticipants.map((participant) => {
                        const participantId = participant.userId || participant._id;
                        const isSelected = memberIds.includes(participantId);
                        
                        return (
                          <label
                            key={participantId}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                            } ${!canAssignMembers ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleMemberCheckboxChange(participantId)}
                              disabled={!canAssignMembers}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium truncate ${
                                  isSelected 
                                    ? 'text-blue-900 dark:text-blue-100' 
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}>
                                  {participant.username || participant.name || participant.email}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${
                                  ['admin', 'manager', 'project-manager'].includes(participant.roleInProject?.toLowerCase())
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                                }`}>
                                  {participant.roleInProject}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              {memberIds.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {memberIds.length} member{memberIds.length !== 1 ? 's' : ''}
                </div>
              )}
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
      {activeTab === 'tickets' && (
        <div className="mt-8">
          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-red-600">Delete Ticket</h3>
                  <button
                    onClick={handleDeleteCancel}
                    aria-label="Close"
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded-full transition-colors"
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
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
                      <Loader2 className="animate-spin mr-2 inline h-4 w-4" />
                    ) : null}
                    {deletingTicket ? 'Deleting...' : 'Confirm Delete'}
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
          {tickets.length !== 0 && !loadingTickets && (
            <table className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-md overflow-hidden">
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
            </table>
          )}

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
            
            {/* ✅ FIXED: Multiple Selection for Ticket Assignment using Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Assign To (multiple selection allowed)
              </label>
              <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                <label className="flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={!Array.isArray(newTicket.assignedTo) || newTicket.assignedTo.length === 0}
                    onChange={() => setNewTicket(prev => ({ ...prev, assignedTo: [] }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-3"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Unassigned</span>
                </label>
                
                {getUniqueParticipants().map((participant) => {
                  const participantId = participant.userId || participant._id;
                  const isSelected = Array.isArray(newTicket.assignedTo) && newTicket.assignedTo.includes(participantId);
                  
                  return (
                    <label
                      key={participantId}
                      className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTicketAssigneeChange(participantId)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium truncate ${
                            isSelected 
                              ? 'text-blue-900 dark:text-blue-100' 
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {participant.username || participant.name || participant.email}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300 ml-2 flex-shrink-0">
                            {participant.roleInProject}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {Array.isArray(newTicket.assignedTo) && newTicket.assignedTo.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {newTicket.assignedTo.length} assignee{newTicket.assignedTo.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
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
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
