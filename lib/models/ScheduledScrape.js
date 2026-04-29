import mongoose from 'mongoose';

const ScheduledScrapeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  layer: { type: String, enum: ['surface', 'deep', 'dark'], required: true },
  extractionType: { type: String, required: true },
  authConfig: { type: mongoose.Schema.Types.Mixed, default: null },
  schedule: {
    type: String,
    enum: ['hourly', 'every6h', 'every12h', 'daily', 'weekly'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
  lastRun: { type: Date, default: null },
  nextRun: { type: Date, required: true },
  notifyEmail: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Helper: compute nextRun from schedule string
ScheduledScrapeSchema.statics.computeNextRun = function (schedule, from = new Date()) {
  const d = new Date(from);
  switch (schedule) {
    case 'hourly':   d.setHours(d.getHours() + 1); break;
    case 'every6h':  d.setHours(d.getHours() + 6); break;
    case 'every12h': d.setHours(d.getHours() + 12); break;
    case 'daily':    d.setDate(d.getDate() + 1); break;
    case 'weekly':   d.setDate(d.getDate() + 7); break;
  }
  return d;
};

export default mongoose.models.ScheduledScrape || mongoose.model('ScheduledScrape', ScheduledScrapeSchema);
