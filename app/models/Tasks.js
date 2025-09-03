import mongoose from "mongoose";

/* ----------------------------------------
   🎯 Ticket Subdocument Schema
   - Can only be raised inside a Task
   - Restricted to Admin/Manager in API layer 
----------------------------------------- */
const ticketSchema = new mongoose.Schema({
  issueTitle: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  priority: { 
    type: String, 
    enum: ["low", "medium", "high", "urgent"], 
    default: "medium" 
  },
  status: { 
    type: String, 
    enum: ["open", "in-progress", "resolved"], 
    default: "open" 
  },
  startDate: { type: Date },
  dueDate: { type: Date },
  tag: { type: String, enum: ["bug", "development", "other"], default: "other" },
  resolution: { 
    type: String,
    default: null 
  },
  comments: [{
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
  }],  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });


/* ----------------------------------------
   🎯 Task Schema (Self-referencing Model)
   - Tasks and Subtasks share the same schema
   - Supports infinite nesting
----------------------------------------- */
const taskSchema = new mongoose.Schema({
 /* 🔹 Basic Task Info */
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed", "blocked"],
    default: "pending"
  },

  /* 🔹 Dates */
  startDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        return !this.dueDate || value <= this.dueDate;
      },
      message: "Start date must be before or equal to due date"
    }
  },
  dueDate: { type: Date },

  /* 🔹 Priority */
  priority: { 
    type: String, 
    enum: ["low", "medium", "high", "urgent"], 
    default: "medium" 
  },

  /* 🔹 Progress Tracking */
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  estimatedHours: { type: Number, min: 0 },
  actualHours: { type: Number, min: 0 },

  /* 🔹 Checklist */
    checklist: [{
    item: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date }
  }],

  /* 🔹 Assignment */
assignees:[
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      state: { type: String, enum: ["assigned", "in-progress", "completed"], default: "assigned" }
    }
  ], // multiple assignees
assignedTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }], 
assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

  /* 🔹 Dependencies */
  dependencies: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    type: { 
      type: String, 
      enum: ["blocks", "blocked-by", "relates-to"],
      required: true 
    }
  }],

  /* 🔹 Attachments */
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],

  /* 🔹 Activity Log */
  activityLog: [{
    action: { 
      type: String, 
      enum: ["created", "updated", "status-changed", "assigned", "comment-added"],
      required: true 
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  /* 🔹 Self-referencing for Subtasks */
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],

  /* 🔹 Tickets inside a Task */
  tickets: [ticketSchema],

  /* 🔹 Metadata */
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
/* ----------------------------------------
   🎯 Indexes for better query performance
----------------------------------------- */
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ "assignees": 1 });
taskSchema.index({ createdAt: -1 });

/* ----------------------------------------
   🎯 Virtuals
----------------------------------------- */
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

/* ----------------------------------------
   🎯 Pre-save middleware
----------------------------------------- */
taskSchema.pre('save', async function(next) {
  // Update progress based on checklist
  if (this.checklist && this.checklist.length > 0) {
    const completed = this.checklist.filter(item => item.isCompleted).length;
    this.progress = Math.round((completed / this.checklist.length) * 100);
  }
  next();
});

export default mongoose.models.Task || mongoose.model("Task", taskSchema);
