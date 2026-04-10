import mongoose from 'mongoose';

const ScrapeResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  layer: { type: String, enum: ['surface', 'deep', 'dark'], required: true },
  extractionType: { type: String, required: true },
  resultCount: { type: Number, default: 0 },
  data: { type: [mongoose.Schema.Types.Mixed], default: [] },
  rawHtmlSize: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'partial', 'failed'], default: 'success' },
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 604800 }, // TTL: 7 days
});

export default mongoose.models.ScrapeResult || mongoose.model('ScrapeResult', ScrapeResultSchema);
