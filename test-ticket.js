"use client";

import React, { useState } from "react";

export default function TestTicket() {
  const [issueTitle, setIssueTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const taskId = "your_task_id_here"; // Replace with actual task ID
    const res = await fetch(`/api/tasks/${taskId}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ issueTitle, description }),
    });
    const data = await res.json();
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={issueTitle}
        onChange={(e) => setIssueTitle(e.target.value)}
        placeholder="Issue Title"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <button type="submit">Create Ticket</button>
    </form>
  );
}
