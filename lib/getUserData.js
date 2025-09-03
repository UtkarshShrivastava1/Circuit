// import { auth, firestore } from "@/lib/firebase";
// import {
//   doc,
//   onSnapshot,
//   collection,
//   updateDoc,
//   arrayUnion,
//   getDoc,
//   getDocs,
// } from "firebase/firestore";

// export const getUserData = async () => {
//   const user = auth.currentUser;

//   if (!user) {
//     throw new Error("No authenticated user found");
//   }

//   const uid = user.uid;
//   const userDocRef = doc(firestore, "users", uid);

//   return new Promise((resolve, reject) => {
//     const unsubscribe = onSnapshot(
//       userDocRef,
//       (docSnap) => {
//         if (docSnap.exists()) {
//           // console.log("User document data:", docSnap.data());
//           resolve(docSnap.data());
//         } else {
//           reject("No user document found");
//         }
//       },
//       (error) => {
//         reject("Error fetching user data:", error);
//       }
//     );
//   });
// };

// // Fetch all users from the 'users' collection
// export const getAllUsers = async () => {
//   const usersCollectionRef = collection(firestore, "users");

//   try {
//     const querySnapshot = await getDocs(usersCollectionRef);
//     const usersList = querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     // console.log("Users list:", usersList);
//     return usersList;
//   } catch (error) {
//     console.error("Error fetching all users:", error);
//     throw error;
//   }
// };

// export const getAllProjects = async () => {
//   const projectsCollectionRef = collection(firestore, "projects");

//   return new Promise((resolve, reject) => {
//     const unsubscribe = onSnapshot(
//       projectsCollectionRef,
//       (snapshot) => {
//         const projectsList = snapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));
//         // console.log("Projects list:", projectsList);
//         resolve(projectsList);
//       },
//       (error) => {
//         reject("Error fetching all projects:", error);
//       }
//     );
//   });
// };

// // Fetch existing work updates for a specific project using real-time listener
// export const getProjectUpdates = (projectName, callback) => {
//   const docRef = doc(firestore, "projectUpdates", projectName);

//   const unsubscribe = onSnapshot(
//     docRef,
//     (docSnap) => {
//       if (docSnap.exists()) {
//         callback(docSnap.data().updates || []);
//       } else {
//         callback([]);
//       }
//     },
//     (error) => {
//       console.error("Error fetching work updates:", error);
//     }
//   );

//   // Return the unsubscribe function to stop listening when needed
//   return unsubscribe;
// };

// // Update work updates for a specific project
// export const updateProjectUpdates = async (projectName, newUpdate) => {
//   const docRef = doc(firestore, "projectUpdates", projectName);

//   await updateDoc(docRef, {
//     updates: arrayUnion(newUpdate),
//   });
// };
// Connect to MongoDB
import dbConnect from "@/lib/mongodb";

export async function getUserData(userId) {
  if (!userId) throw new Error("User ID required");
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");
  return user;
}

export async function getAllUsers() {
  await dbConnect();
  return await User.find().lean();
}

export async function getAllProjects() {
  await dbConnect();
  return await Project.find().lean();
}

export async function getProjectByName(projectName) {
  await dbConnect();
  const project = await Project.findOne({ projectName }).lean();
  if (!project) throw new Error("Project not found");
  return project;
}

export async function getProjectUpdates(projectName) {
  await dbConnect();
  const updatesDoc = await ProjectUpdate.findOne({ projectName }).lean();
  return updatesDoc?.updates || [];
}

export async function addProjectUpdate(projectName, newUpdate) {
  await dbConnect();
  const options = { upsert: true, new: true };
  return await ProjectUpdate.findOneAndUpdate(
    { projectName },
    { $push: { updates: newUpdate } },
    options
  );
}

export async function getProjectAnnouncements(projectName) {
  await dbConnect();
  const doc = await ProjectUpdate.findOne({ projectName }).lean();
  return doc?.announcements || [];
}

export async function addProjectAnnouncement(projectName, newAnnouncement) {
  await dbConnect();
  const options = { upsert: true, new: true };
  return await ProjectUpdate.findOneAndUpdate(
    { projectName },
    { $push: { announcements: newAnnouncement } },
    options
  );
}