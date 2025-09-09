// // /models/User.js

// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//   },
//   password: {
//     type: String,
//     required: true,
//   },
//   // confirmPassword: {
//   //   type: String,
//   //   required: true,
//   // },
//   profileImg: {
//     type: Buffer, // storing image as binary, can also store URL only if preferred
//     default: null,
//   },
//   profileImgUrl: {
//     type: String,
//     default: '',
//   },
//   name: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   gender: {
//     type: String,
//     enum: ['male', 'female', 'other', 'prefer not to say'],
//     default: 'male',
//   },
//   role: {
//     type: String,
//     enum: ['member', 'admin', 'manager'],
//     default: 'member',
//   },
//   phoneNumber: {
//     type: String,
//     default: '',
//   },
//   dateOfBirth: {
//     type: Date,
//   },
//   profileState: {
//     type: String,
//     enum: ['active', 'inactive'],
//     default: 'active',
//   },
//   forgotpasswordToken: {
//     type: String,
//     },
//     verified: {
//     type: Boolean,
//     default: false,
//   },
//   forgotPasswordExpires: {
//     type: Date,
//     default: Date.now,
//   },
//   notifications: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Notification',
//     },
//   ],
//   tasks:[{
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Task',
//     },],
    
//   leaveHistory: [{
//   type: mongoose.Schema.Types.ObjectId,
//   ref: 'Leave'
//     }],
//   leaveBalances: {
//   paid: { type: Number, default: 0 },
//   // Add more types if needed
//   },

//   veriyToken: {
//     type: String,
//     default: '',
//   },
//   veriyTokenExpires: {
//     type: Date,
//     default: Date.now,
//   },
// }, { timestamps: true });


// const User = mongoose.models.User || mongoose.model('User', userSchema);

// export default User;
// /models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileImg: {
    type: Buffer,
    default: null,
  },
  profileImgUrl: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer not to say'],
    default: 'male',
  },
  role: {
    type: String,
    enum: ['member', 'admin', 'manager'],
    default: 'member',
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  dateOfBirth: {
    type: Date,
  },
  profileState: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  stateChangedAt: {
    type: Date,
    default: null,
  },
  forgotpasswordToken: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  forgotPasswordExpires: {
    type: Date,
    default: Date.now,
  },
  notifications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
    },
  ],
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
  leaveHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leave'
  }],
  leaveBalances: {
    paid: { type: Number, default: 0 },
  },
  veriyToken: {
    type: String,
    default: '',
  },
  veriyTokenExpires: {
    type: Date,
    default: Date.now,
  },
}, { 
  timestamps: true,
  strict: false // Allow additional fields to be saved
});

// Commented out pre-save hook to avoid conflicts with manual updates
// userSchema.pre('save', function(next) {
//   if (this.isModified('profileState')) {
//     this.stateChangedAt = new Date();
//   }
//   next();
// });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
