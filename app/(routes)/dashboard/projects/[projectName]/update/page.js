"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import Image from "next/image";
import { CaretSortIcon } from "@radix-ui/react-icons";
import Loading from "../../../_components/Loading";

const UpdateProject = () => {
  const [formData, setFormData] = useState({
    projectName: "",
    projectState: "ongoing",
    projectDomain: "",
    startDate: "",
    endDate: "",
  });
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [emailOptions, setEmailOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedResponsibility, setSelectedResponsibility] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchSessionAndData() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (!sessionRes.ok) throw new Error("Not authenticated");
        const userData = await sessionRes.json();
        setCurrentUserRole(userData.role);

        const projectName = pathname.split("/")[3];

        const projectRes = await fetch(`/api/projects/${projectName}`);
        if (!projectRes.ok) throw new Error("Project not found");
        const projectData = await projectRes.json();

        setFormData({
          projectName: projectData.projectName,
          projectState: projectData.projectState,
          projectDomain: projectData.projectDomain,
          startDate: projectData.startDate ? projectData.startDate.split("T")[0] : "",
          endDate: projectData.endDate ? projectData.endDate.split("T")[0] : "",
        });
        setParticipants(projectData.participants || []);
        console.log('projectData.participants',projectData.participants)


        // console.log('participants : ' , projectData.participants);

        const usersRes = await fetch("/api/user");
        if (!usersRes.ok) throw new Error("Failed fetching users");
        const users = await usersRes.json();
        setAllUsers(users);
        setEmailOptions(users.map((u) => ({ value: u.email, label: u.email })));
      } catch (err) {
        setError(err.message);
        if (err.message === "Not authenticated") {
          router.push("/login");
        } else {
          toast.error(err.message);
        }
      }
    }
    fetchSessionAndData();
  }, [pathname, router]);

  useEffect(() => {
    if (currentUserRole === "member") {
      router.push("/dashboard");
    }
  }, [currentUserRole, router]);

  const handleSelect = (email) => {
    const user = allUsers.find((u) => u.email === email);
    if (user) {
      setSelectedUser(email);
      setSelectedUserData(user);
      setUserPickerOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateDates = (startDate, endDate) =>
    !startDate || !endDate || new Date(startDate) <= new Date(endDate);

  const handleAddParticipant = () => {
    if (!selectedUser || !selectedRole || !selectedResponsibility) {
      toast.error("Please select all fields for the participant.");
      return;
    }

    if (participants.find((p) => p.email === selectedUser)) {
      toast.error("Participant already added.");
      return;
    }

    const newEntry = {
    email: selectedUser,
    roleInProject: selectedRole,
    responsibility: selectedResponsibility,
    profileImage: selectedUserData?.profileImgUrl,
    userRole: selectedUserData?.role,
    username: selectedUserData?.name,
    userId: selectedUserData // or build object { email, name, _id }
  };


    setParticipants((prev) => [...prev, newEntry]);

    // console.log("Participant : ",participants);



    setSelectedUser(null);
    setSelectedUserData(null);
    setSelectedRole("");
    setSelectedResponsibility("");
  };

  const handleRemoveParticipant = (email) => {
    setParticipants((prev) => prev.filter((p) => p.email !== email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!validateDates(formData.startDate, formData.endDate)) {
      setError("End date cannot be earlier than the start date.");
      setLoading(false);
      return;
    }

   



    // if (projectManagerCount !== 1) {
    //   setError("There must be exactly one project manager.");
    //   setLoading(false);
    //   return;
    // }


    // console.log(" Participants: ", participants);


    // const projectMemberCount = participants.filter(
    //   (p) => p.responsibility === "project-member"
    // ).length;

    // console.log(projectMemberCount )

    // if (projectMemberCount < 1) {
    //   setError("There must be at least one project member.");
    //   setLoading(false);
    //   return;
    // }

    try {
      const projectName = formData.projectName.toLowerCase();

      const res = await fetch(`/api/projects/${projectName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectState: formData.projectState,
          projectDomain: formData.projectDomain,
          startDate: formData.startDate,
          endDate: formData.endDate,
          participants,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update project");
      }

      toast.success("Project updated successfully!");
      router.push("/dashboard/projects");
    } catch (err) {
      setError(err.message);
      toast.error(`Error updating project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUserRole) return <div className="text-center"><Loading message="Loading..."/></div>;

  const selectedUserObj = selectedUser
    ? allUsers.find((u) => u.email === selectedUser)
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Update Project</h2>
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Update the project details below.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                name="projectName"
                value={formData.projectName}
                readOnly
                className="bg-gray-200 dark:bg-gray-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="projectState">Project State</Label>
              <select
                id="projectState"
                name="projectState"
                value={formData.projectState}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="ongoing">Ongoing</option>
                <option value="deployment">Deployment</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                readOnly
                className="bg-gray-200 dark:bg-gray-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-1">
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
                <option value="content-creation">Content creation</option>
                <option value="software-developer">Software Developer</option>
                <option value="testing">Testing</option>
              </select>
            </div>

            {/* Participant selection */}
            <div className="space-y-4 w-full">
              <div className="flex flex-col w-full lg:flex-row lg:items-center lg:justify-between lg:gap-4 gap-2">
                <div className="flex w-full gap-4">
                  <div className="space-y-1 w-full pt-2 flex flex-col">
                    <Label htmlFor="selectUser">Select User</Label>
                    <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={userPickerOpen}
                          className="justify-between w-full"
                        >
                          {selectedUserObj
                            ? `${selectedUserObj.name ?? "Unknown User"} (${selectedUserObj.email})`
                            : "Select user..."}
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
                              const opts = allUsers
                                .filter(
                                  (user) =>
                                    user.email.toLowerCase().includes(val) ||
                                    (user.name ?? "").toLowerCase().includes(val)
                                )
                                .map((user) => ({ value: user.email, label: user.email }));
                              setEmailOptions(opts);
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>No user found.</CommandEmpty>
                            <CommandGroup>
                              {(emailOptions.length
                                ? emailOptions
                                : allUsers.map((u) => ({ value: u.email, label: u.email }))).map(
                                (option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleSelect(option.value)}
                                  >
                                    <div className="flex items-center space-x-4">
                                      <Image
                                        src={
                                          allUsers.find((u) => u.email === option.value)?.profileImgUrl ||
                                          "/user.png"
                                        }
                                        alt="User Avatar"
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 rounded-full object-cover"
                                      />
                                      <div className="flex-1">
                                        <div className="font-semibold">
                                          {allUsers.find((u) => u.email === option.value)?.name ||
                                            "Unknown User"}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {allUsers.find((u) => u.email === option.value)?.email ||
                                            option.value}
                                          <br />
                                          {allUsers.find((u) => u.email === option.value)?.role ||
                                            "No Role"}
                                        </div>
                                      </div>
                                    </div>
                                  </CommandItem>
                                )
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex w-full gap-4">
                  <div className="space-y-1 w-full">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"
                    >
                      <option value="">Select Role</option>
                      <option value="project-manager"
                               disabled={participants.some(p => p.roleInProject === "project-manager")}>
                                Project Manager</option>
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
                type="button"
                onClick={handleAddParticipant}
                disabled={!selectedUser || !selectedRole || !selectedResponsibility}
              >
                Add Participant
              </Button>
            </div>

            <div className="space-y-1">
              <Label>Current Participants</Label>
              <div className="grid grid-cols-1 gap-2">
               {participants.map((p) => (
  <Card
    key={p.email}
    className="flex flex-col md:flex-row items-center md:items-start gap-4 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-shadow hover:shadow-md"
  >
    <CardContent className="flex items-center gap-4 flex-grow p-0">
      <div className="flex-shrink-0">
        <Image
          src={p.profileImage || "/user.png"}
          alt={`${p.username || p.email}'s profile`}
          width={48}
          height={48}
          className="rounded-full border-2 border-indigo-500 dark:border-indigo-400 object-cover"
        />
      </div>
      <div className="flex flex-col overflow-hidden min-w-0">
        <span className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
          {p.username || p.email}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {p.email}
        </span>
        {/* <span className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mt-1 truncate">
          {p.userRole || "No Role"}
        </span> */}
        <div className="mt-2 space-y-1">
          <p className="text-sm text-gray-700 dark:text-indigo-400 mt-1 truncate"> 
            <strong>Role: </strong> {p.roleInProject}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
            <strong>Responsibility: </strong> {p.responsibility}
          </p>
        </div>
      </div>
    </CardContent>

    <CardFooter className="p-0 md:pl-4 flex justify-end md:justify-center w-full md:w-auto">
      <Button
        variant="destructive"
        size="sm"
        className="px-4 py-1.5 text-sm font-semibold whitespace-nowrap"
        onClick={() => handleRemoveParticipant(p.email)}
      >
        Remove
      </Button>
    </CardFooter>
  </Card>
))}

              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 w-full">
            {error && <div className="text-red-700 w-full bg-red-100 rounded p-2">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Project"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ToastContainer />
    </div>
  );
};

export default UpdateProject;
