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