import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: String, enum: ['paid', 'sick', 'casual'], default: 'paid' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  decision: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
