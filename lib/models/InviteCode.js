import mongoose from 'mongoose';

const InviteCodeSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isUsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.InviteCode || mongoose.model('InviteCode', InviteCodeSchema);
