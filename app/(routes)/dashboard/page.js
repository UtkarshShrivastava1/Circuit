"use client";

import { useEffect, useState } from "react";
import ProjectCard from "@/app/(routes)/dashboard/_components/ProjectCard"; // Adjust path as needed
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Loading from "./_components/Loading";
import { FolderX } from "lucide-react"; 

const MyProjects = ({ customEmail, heading }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const displayHeading = heading || "My Projects";

  useEffect(() => {
    async function fetchData() {
      try {
         const token = localStorage.getItem('token'); // or however you store your token
    
    if (!token) {
      throw new Error('No authentication token found');
    }

        // Check user session
        const sessionRes = await fetch("/api/auth/session");
        if (!sessionRes.ok) {
          router.push("/login");
          return;
        }
        const userData = await sessionRes.json();
        const userEmail = customEmail || userData.email; 



        // console.log(userEmail)

        // Fetch all projects
        const projectsRes = await fetch("/api/projects/",{
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
        if (!projectsRes.ok) throw new Error("Failed to fetch projects");
        const allProjects = await projectsRes.json();

        // console.log("Project res : " , allProjects)

        // Filter projects where user is participant
        const userProjects = allProjects.filter((project) =>
          project.participants.some(
            (participant) => participant.email === userEmail
          )
        );

        // Sort projects: ongoing first, then completed; then by start date desc
        const statePriority = { ongoing: 1, completed: 2 };
        const sortedProjects = userProjects.sort((a, b) => {
          const stateComp =
            (statePriority[a.projectState] ?? 99) -
            (statePriority[b.projectState] ?? 99);
          if (stateComp !== 0) return stateComp;
          return new Date(b.startDate) - new Date(a.startDate);
        });

        setProjects(sortedProjects);
      } catch (error) {
        console.error("Error fetching projects or user data:", error);
        toast.error("Error loading projects");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [customEmail, router]);

  if (loading)
    return <div className="flex justify-center"><Loading message="Please wait, fetching data..." />
</div>;

  return (
    <>
      <h2 className="text-xl py-2 px-2 font-bold pt-1">{displayHeading}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project._id || project.id} project={project} />
          ))
        ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white shadow-md border border-gray-100">
          <FolderX className="w-14 h-14 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No projects available</h2>
          <p className="text-gray-500 mb-6">You haven’t created any projects yet.<br />Start your first project to see it appear here!</p>
         
           
        </div>
        )}
      </div>
    </>
  );
};

export default MyProjects;
