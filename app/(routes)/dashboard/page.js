"use client";

import { useEffect, useState } from "react";
import ProjectCard from "@/app/(routes)/dashboard/_components/ProjectCard"; // Adjust path as needed
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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
    return <div className="flex justify-center">Loading...</div>;

  return (
    <>
      <h2 className="text-xl py-2 px-2 font-bold pt-1">{displayHeading}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project._id || project.id} project={project} />
          ))
        ) : (
          <div>No projects available</div>
        )}
      </div>
    </>
  );
};

export default MyProjects;
