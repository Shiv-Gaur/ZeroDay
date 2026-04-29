#!/usr/bin/env node
/**
 * scripts/cron-worker.js
 * Standalone cron worker — runs separately from Next.js.
 * Start with: node scripts/cron-worker.js
 * Polls MongoDB every 60s for due ScheduledScrapes, executes them, saves results.
 */

import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { scrapeSurface } from '../lib/scrapers/surface.js';
import { scrapeDeep } from '../lib/scrapers/deep.js';
import { scrapeDark } from '../lib/scrapers/dark.js';

// Inline schemas (no Next.js module resolution available here)
const ScrapeResultSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  url: String,
  layer: String,
  extractionType: String,
  resultCount: Number,
  data: [mongoose.Schema.Types.Mixed],
  rawHtmlSize: Number,
  duration: Number,
  status: String,
  error: String,
  createdAt: { type: Date, default: Date.now, expires: 604800 },
});
const ScrapeResult = mongoose.models.ScrapeResult || mongoose.model('ScrapeResult', ScrapeResultSchema);

const ScheduleSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  url: String,
  layer: String,
  extractionType: String,
  authConfig: mongoose.Schema.Types.Mixed,
  schedule: String,
  isActive: Boolean,
  lastRun: Date,
  nextRun: Date,
  notifyEmail: String,
});

function computeNextRun(schedule, from = new Date()) {
  const d = new Date(from);
  switch (schedule) {
    case 'hourly':   d.setHours(d.getHours() + 1); break;
    case 'every6h':  d.setHours(d.getHours() + 6); break;
    case 'every12h': d.setHours(d.getHours() + 12); break;
    case 'daily':    d.setDate(d.getDate() + 1); break;
    case 'weekly':   d.setDate(d.getDate() + 7); break;
  }
  return d;
}

const Schedule = mongoose.models.ScheduledScrape || mongoose.model('ScheduledScrape', ScheduleSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/webscope';

async function sendNotification(email, job, result) {
  if (!email || !process.env.SMTP_HOST) return;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'WEBSCOPE <noreply@localhost>',
      to: email,
      subject: `WEBSCOPE: Scheduled scrape ${result.status}`,
      text: `URL: ${job.url}\nLayer: ${job.layer}\nExtraction: ${job.extractionType}\nStatus: ${result.status}\nRecords: ${result.resultCount}\nDuration: ${result.duration}ms`,
    });
  } catch (e) {
    console.error('[cron] Email notification failed:', e.message);
  }
}

const scrapers = { surface: scrapeSurface, deep: scrapeDeep, dark: scrapeDark };

async function runDueJobs() {
  const now = new Date();
  const due = await Schedule.find({ isActive: true, nextRun: { $lte: now } });

  if (due.length > 0) {
    console.log(`[cron] ${due.length} job(s) due at ${now.toISOString()}`);
  }

  for (const job of due) {
    try {
      const scraper = scrapers[job.layer];
      if (!scraper) continue;

      const result = await scraper(job.url, job.extractionType, job.authConfig);

      const saved = await ScrapeResult.create({
        userId: job.userId,
        url: job.url,
        layer: job.layer,
        extractionType: job.extractionType,
        resultCount: result.count,
        data: result.data,
        rawHtmlSize: result.rawHtmlSize,
        duration: result.duration,
        status: result.status,
        error: result.error,
      });

      await Schedule.findByIdAndUpdate(job._id, {
        lastRun: now,
        nextRun: computeNextRun(job.schedule, now),
      });

      await sendNotification(job.notifyEmail, job, saved);
      console.log(`[cron] Job ${job._id} (${job.layer}/${job.url}) → ${result.status}`);
    } catch (e) {
      console.error(`[cron] Job ${job._id} failed:`, e.message);
    }
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[cron] Connected to MongoDB');
  console.log('[cron] Worker started — polling every 60s');

  // Run immediately on start, then every 60s
  await runDueJobs();
  setInterval(runDueJobs, 60_000);
}

main().catch((e) => { console.error('[cron] Fatal:', e); process.exit(1); });
