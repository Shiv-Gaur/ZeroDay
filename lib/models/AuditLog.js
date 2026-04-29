import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['scrape', 'export', 'schedule_create', 'schedule_delete', 'admin_role_change', 'login', 'register'],
    required: true,
  },
  target: { type: String, default: '' }, // URL or userId acted upon
  layer: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // 30-day TTL — NEVER log IP addresses, user agents, or connection metadata
  timestamp: { type: Date, default: Date.now, expires: 2592000 },
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
