'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CaretSortIcon } from "@radix-ui/react-icons";

const CreateProject = () => {
  const [formData, setFormData] = useState({
    projectName: "",
    projectState: "ongoing",
    projectDomain: "",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [selectedResponsibility, setSelectedResponsibility] = useState("");
  const [emailOptions, setEmailOptions] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false); // Control popover visibility

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    async function fetchUserRole() {
      try {
        const res = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUserRole(user.role);
        } else {
          router.push("/login");
        }
      } catch {
        setError("Cannot fetch user session");
        router.push("/login");
      }
    }
    fetchUserRole();
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    async function fetchUsers() {
      try {
        const res = await fetch("/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");
        const users = await res.json();
        setAllUsers(users);
        setEmailOptions(users.map((user) => ({ value: user.email, label: user.email })));
      } catch (err) {
        setError(`Error fetching users: ${err.message}`);
      }
    }
    fetchUsers();
  }, [router]);

  const handleSelect = (email) => {
    const user = allUsers.find((u) => u.email === email);
    if (user) {
      setSelectedUser(email);
      setSelectedUserData(user);
      setPopoverOpen(false); // Close popover on selection
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

const handleAddParticipant = () => {
  if (!selectedUser || !selectedRole || !selectedResponsibility) {
    toast.error("Please select all fields for the participant.");
    return;
  }
  if (participants.find((p) => p.email === selectedUser)) {
    toast.error("Participant already added.");
    return;
  }

  setParticipants([
    ...participants,
    {
      userId: selectedUserData._id,
      email: selectedUser,
      username: selectedUserData.name || "Unknown User",
      roleInProject: selectedRole,
      responsibility: selectedResponsibility,
      profileImage: selectedUserData.profileImgUrl || "/user.png",
      userRole: selectedUserData.role || "No Role",
    },
  ]);

  // Remove the selected user from dropdown options
  setEmailOptions(emailOptions.filter(({ value }) => value !== selectedUser));

  // Reset selections for next addition
  setSelectedUser(null);
  setSelectedUserData(null);
  setSelectedRole("");
  setSelectedResponsibility("");
};


  const handleRemoveParticipant = (email) => {
    setParticipants((prev) => prev.filter((p) => p.email !== email));
    setEmailOptions((prev) => [...prev, { value: email, label: email }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.projectName.length < 3) {
      alert("Project name must be at least 3 characters long.");
      return;
    }
    if (participants.length === 0) {
      alert("Please add at least one participant.");
      return;
    }

    const managerParticipant = participants.find(
      (p) => p.roleInProject === "project-manager"
    );
    if (!managerParticipant) {
      alert("Please add a participant with role 'Project Manager'.");
      return;
    }

    const projectData = {
      ...formData,
      managerId: managerParticipant.userId,
      participants: participants.map(({ userId, roleInProject, responsibility, email, username }) => ({
        userId,
        roleInProject,
        responsibility,
        email,
        username,
      })),
    };

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required.");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`❌ API Error: ${data?.message || "Unknown error"}`);
        setLoading(false);
        return;
      }
      alert("✅ Project created successfully!");
      router.push("/dashboard/projects");
    } catch (err) {
      alert("Network error — check console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === "member") {
      router.push("/dashboard");
    }
  }, [currentUserRole, router]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create New Project</h2>
      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Project Info</TabsTrigger>
          <TabsTrigger value="create">Create Project</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Provide project details and proceed to the next tab to create the project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1 lg:flex lg:space-x-4 lg:space-y-0">
                <div className="flex-1">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="projectState">Project State</Label>
                  <select
                    id="projectState"
                    name="projectState"
                    value="ongoing"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"
                  >
                    <option value="">Select State</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="deployment">Deployment</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1 md:flex md:space-x-4 md:space-y-0 lg:flex lg:space-x-4 lg:space-y-0">
                <div className="flex-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-1 lg:flex lg:space-x-4 lg:space-y-0">
                <div className="flex-1">
                  <Label htmlFor="projectDomain">Project Domain</Label>
                  <select
                    id="projectDomain"
                    name="projectDomain"
                    value={formData.projectDomain}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"
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
            <CardFooter>
              <Button onClick={() => setActiveTab("create")}>Next</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Create Participants Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Project</CardTitle>
              <CardDescription>
                Review the project information and add participants before finalizing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() =>
                  document.getElementById("participantsForm").classList.toggle("hidden")
                }
                className="mb-4"
              >
                New Participants
              </Button>

              <form
                id="participantsForm"
                className="hidden"
                onSubmit={(e) => { e.preventDefault(); handleAddParticipant(); }}
              >
                <div className="space-y-4 w-full">
                  <div className="flex w-full lg:flex-row lg:items-center lg:justify-between lg:gap-4 gap-2">
                    <div className="flex w-full gap-4">
                      <div className="space-y-1 w-full pt-2 flex flex-col">
                        <Label htmlFor="selectUser">Select User</Label>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={popoverOpen}
                              className="justify-between w-full"
                            >
                              {selectedUser ? selectedUser : "Select user..."}
                              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search user..."
                                className="h-9"
                                onChange={(e) => {
                                  const val = e.target.value.toLowerCase();
                                  setEmailOptions(
                                    allUsers
                                      .filter((user) => user.email.toLowerCase().includes(val))
                                      .map((user) => ({ value: user.email, label: user.email }))
                                  );
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>No user found.</CommandEmpty>
                                <CommandGroup>
                                  {emailOptions.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={option.value}
                                      onSelect={handleSelect}
                                    >
                                      <div className="flex items-center space-x-4">
                                        <Image
                                          src={
                                            allUsers.find((user) => user.email === option.value)
                                              ?.profileImgUrl || "/user.png"
                                          }
                                          alt="User Avatar"
                                          width={40}
                                          height={40}
                                          className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1">
                                          <div className="font-semibold">
                                            {allUsers.find((user) => user.email === option.value)
                                              ?.name || "Unknown User"}
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            {option.value}
                                            <br />
                                            {allUsers.find((user) => user.email === option.value)
                                              ?.role || "No Role"}
                                          </div>
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
                    </div>

                    <div className="flex w-full gap-4">
                      <div className="space-y-1 w-full">
                        <Label htmlFor="role">Role in project</Label>
                        <select
                          id="role"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"
                        >
                          <option value="">Select Role in Project</option>
                          <option value="project-manager">Project Manager</option>
                          <option value="project-member">Project Member</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex w-full gap-4">
                      <div className="space-y-1 w-full">
                        <Label htmlFor="responsibility">Responsibility</Label>
                        <select
                          id="responsibility"
                          value={selectedResponsibility}
                          onChange={(e) => setSelectedResponsibility(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"
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
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedUser || !selectedRole || !selectedResponsibility}
                  >
                    Add Participant
                  </Button>
                </div>
              </form>

              <div className="mt-4">
                <h3 className="text-xl font-semibold">Participants</h3>
                <ul>
                  {participants.map((participant) => (
                    <div
                      key={participant.email}
                      className="flex lg:justify-between lg:flex-row flex-col lg:items-center border p-2 rounded-md"
                    >
                      <div className="flex md:items-center items-start md:justify-between flex-col md:flex-row gap-1 space-x-4">
                        <div className="flex flex-row items-center gap-1">
                          <Image
                            src={participant.profileImage}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">{participant.username}</div>
                            <div className="text-sm text-gray-600">
                              {participant.email}
                              <br />
                              {participant.userRole}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 mb-2 border border-slate-200 p-2 rounded-lg">
                          <div className="font-medium text-md flex flex-row gap-1">
                            {participant.roleInProject}
                          </div>
                          <div className="font-medium text-md flex flex-row gap-1">
                            {participant.responsibility}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveParticipant(participant.email)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex items-center flex-col gap-4 justify-between">
              {error && (
                <div className="text-red-700 w-full bg-red-100 rounded p-2">{error}</div>
              )}
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? "Creating Project..." : "Create Project"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  );
};

export default CreateProject;
