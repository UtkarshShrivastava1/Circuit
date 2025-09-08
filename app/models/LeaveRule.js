import mongoose from 'mongoose';

const leaveRuleSchema = new mongoose.Schema({
  maxPaidLeavesPerMonth: { type: Number, default: 2, required: true },
  notes: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

// Singleton helper
leaveRuleSchema.statics.getRule = async function() {
  let rule = await this.findOne();
  if (!rule) rule = await this.create({});
  return rule;
};

export default mongoose.models.LeaveRule || mongoose.model('LeaveRule', leaveRuleSchema);
