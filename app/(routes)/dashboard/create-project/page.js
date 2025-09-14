'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CaretSortIcon } from '@radix-ui/react-icons';

const CreateProject = () => {
  const [formData, setFormData] = useState({
    projectName: '',
    projectState: 'ongoing',
    projectDomain: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [selectedResponsibility, setSelectedResponsibility] = useState('');
  const [emailOptions, setEmailOptions] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const router = useRouter();

  // Fetch user role
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    async function fetchUserRole() {
      try {
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCurrentUserRole((await res.json()).role);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    }
    fetchUserRole();
  }, [router]);

  // Fetch all users
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    async function fetchUsers() {
      try {
        const res = await fetch('/api/user/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const users = await res.json();
        setAllUsers(users);
        setEmailOptions(users.map(user => ({ value: user.email, label: user.email })));
      } catch (err) {
        setError(`Error fetching users: ${err.message}`);
      }
    }
    fetchUsers();
  }, [router]);

  // Redirect non-managers
  useEffect(() => {
    if (currentUserRole === 'member') router.push('/dashboard');
  }, [currentUserRole, router]);

  const handleSelect = (email) => {
    const user = allUsers.find(u => u.email === email);
    if (user) {
      setSelectedUser(email);
      setSelectedUserData(user);
      setPopoverOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddParticipant = () => {
    if (!selectedUser || !selectedRole || !selectedResponsibility) {
      toast.error('Please select all fields for the participant.');
      return;
    }
    if (participants.some(p => p.email === selectedUser)) {
      toast.error('Participant already added.');
      return;
    }
    setParticipants(prev => [
      ...prev,
      {
        userId: selectedUserData._id,
        email: selectedUser,
        username: selectedUserData.name || 'Unknown User',
        roleInProject: selectedRole,
        responsibility: selectedResponsibility,
        profileImage: selectedUserData.profileImgUrl || '/user.png',
        userRole: selectedUserData.role || 'No Role',
      },
    ]);
    setEmailOptions(prev => prev.filter(({ value }) => value !== selectedUser));
    setSelectedUser(null);
    setSelectedUserData(null);
    setSelectedRole('');
    setSelectedResponsibility('');
  };

  const handleRemoveParticipant = (email) => {
    setParticipants(prev => prev.filter(p => p.email !== email));
    setEmailOptions(prev => [...prev, { value: email, label: email }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log('formData : ',formData);
    if (formData.projectName.length < 3) {
      toast.error('Project name must be at least 3 characters long.');
      return;
    }
    if (participants.length === 0) {
      toast.error('Please add at least one participant.');
      return;
    }
    const managerParticipant = participants.find(p => p.roleInProject === 'project-manager');
    if (!managerParticipant) {
      toast.error('Please add a participant with role "Project Manager".');
      return;
    }
    const projectData = {
      ...formData,
      managerId: managerParticipant.userId,
      
      participants: participants.map(({ userId, roleInProject, responsibility, email, username }) => ({
        userId, roleInProject, responsibility, email, username,
      })),
    };
    console.log('project Data : ',projectData)
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required.');
      return router.push('/login');
    }
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || 'Unknown error.');
        return;
      }
      toast.success('Project created successfully!');
      router.push('/dashboard/projects');
    } catch (err) {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-4xl mx-auto p-4 lg:p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <div className="flex flex-col">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center text-gray-900 dark:text-gray-100 tracking-tight">
          Create New Project
        </h2>
        <Tabs
          defaultValue="info"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="info" className="text-xs md:text-sm font-medium">
              Project Info
            </TabsTrigger>
            <TabsTrigger value="create" className="text-xs md:text-sm font-medium">
              Participants
            </TabsTrigger>
          </TabsList>
          <TabsContent value="info">
            <Card className="w-full shadow-sm border-0 dark:border dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100 text-lg md:text-xl">
                  Project Information
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Enter project details and proceed to Participants tab.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectName" className="text-gray-700 dark:text-gray-300">
                      Project Name
                    </Label>
                    <Input
                      id="projectName"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      placeholder="Enter project name"
                      className="bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectState" className="text-gray-700 dark:text-gray-300">
                      Project State
                    </Label>
                    <select
                      id="projectState"
                      name="projectState"
                      value={formData.projectState}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                    >
                      <option value="">Select State</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="deployment">Deployment</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="startDate" className="text-gray-700 dark:text-gray-300">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-gray-700 dark:text-gray-300">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="projectDomain" className="text-gray-700 dark:text-gray-300">
                      Project Domain
                    </Label>
                    <select
                      id="projectDomain"
                      name="projectDomain"
                      value={formData.projectDomain}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                    >
                      <option value="">Select a domain</option>
                      <option value="web-development">Web Development</option>
                      <option value="android-development">Android Development</option>
                      <option value="social-media">Social Media</option>
                      <option value="blockchain">Blockchain</option>
                      <option value="aiml">AI/ML</option>
                      <option value="designing">Designing</option>
                      <option value="content-writing">Content Writing</option>
                      <option value="content-creation">Content Creation</option>
                      <option value="software-developer">Software Developer</option>
                      <option value="testing">Testing</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={() => setActiveTab('create')} className="w-full md:w-auto">
                  Next: Add Participants
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card className="shadow-sm border-0 dark:border dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100 text-lg md:text-xl">
                  Participants
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Review project info and add project members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => document.getElementById("participantsForm").classList.toggle("hidden")}
                  variant="outline"
                  className="w-full mb-4 font-medium"
                >
                  New Participant
                </Button>

                <form
                  id="participantsForm"
                  className="hidden space-y-4 w-full"
                  onSubmit={(e) => { e.preventDefault(); handleAddParticipant(); }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="w-full">
                      <Label htmlFor="selectUser" className="text-gray-700 dark:text-gray-300">
                        Select User
                      </Label>
                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpen}
                            className="w-full justify-between"
                          >
                            {selectedUser ? selectedUser : "Select user..."}
                            <CaretSortIcon className="ml-2 h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 z-[9999]">
                          <Command>
                            <CommandInput
                              placeholder="Search user..."
                              onChange={(e) => {
                                const val = e.target.value.toLowerCase();
                                setEmailOptions(
                                  allUsers
                                    .filter(u => u.email.toLowerCase().includes(val))
                                    .map(u => ({ value: u.email, label: u.email }))
                                );
                              }}
                              className="bg-white dark:bg-slate-900"
                            />
                            <CommandList>
                              <CommandEmpty>No matching users</CommandEmpty>
                              <CommandGroup>
                                {emailOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={handleSelect}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                  >
                                    <Image
                                      src={allUsers.find(u => u.email === option.value)?.profileImgUrl || "/user.png"}
                                      alt="User"
                                      width={32}
                                      height={32}
                                      className="rounded-full w-8 h-8"
                                    />
                                    <div>
                                      <div className="text-gray-900 dark:text-gray-200 font-medium">
                                        {allUsers.find(u => u.email === option.value)?.name || "Unknown User"}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {option.value}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">
                        Role
                      </Label>
                      <select
                        id="role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                      >
                        <option value="">Select Role</option>
                       <option value="project-manager">Project Manager</option>
                        <option value="project-member">Project Member</option>
                      </select>
                        
                    </div>
                    <div>
                      <Label htmlFor="responsibility" className="text-gray-700 dark:text-gray-300">
                        Responsibility
                      </Label>
                      <select
                        id="responsibility"
                        value={selectedResponsibility}
                        onChange={(e) => setSelectedResponsibility(e.target.value)}
                        className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700"
                      >
                        <option value="">Select Responsibility</option>
                             <option value="content">Content</option>
                        <option value="research">Research</option>
                        <option value="design">Design</option>
                        <option value="development">Development</option>
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                        <option value="fullstack">Full Stack</option>
                        <option value="testing">Testing</option>
                        <option value="debugging">Debugging</option>
                        <option value="deployment">Deployment</option>
                        <option value="maintain">Maintain</option>
                      </select>


                        
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        disabled={!selectedUser || !selectedRole || !selectedResponsibility}
                        className="w-full"
                      >
                        Add Participant
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="space-y-4 mt-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Project Members
                  </h3>
                  {participants.length > 0 ? (
           <ul className="space-y-4">
  {participants.map((p) => (
    <li
      key={p.email}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-300 dark:border-gray-700 shadow hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-center gap-4 flex-grow overflow-hidden">
        <Image
          src={p.profileImage || "/user.png"}
          alt="User"
          width={48}
          height={48}
          className="rounded-full w-12 h-12 object-cover border-2 border-indigo-500 dark:border-indigo-400 flex-shrink-0"
        />
        <div className="truncate">
          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.username}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{p.email}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 truncate uppercase tracking-wide">{p.userRole}</div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-col sm:items-start sm:w-36">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">
            Role: {p.roleInProject}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            Responsibility: {p.responsibility}
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-1.5 text-sm font-semibold whitespace-nowrap"
          onClick={() => handleRemoveParticipant(p.email)}
        >
          Remove
        </Button>
      </div>
    </li>
  ))}
</ul>


                  ) : (
                    <div className="p-3 text-center rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm">
                      No participants added yet. Add members to proceed.
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {error && (
                  <div className="w-full py-2 px-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium text-sm text-center">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-2.5 font-medium"
                >
                  {loading ? 'Creating Project...' : 'Create Project'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </div>
  );
};

export default CreateProject;
