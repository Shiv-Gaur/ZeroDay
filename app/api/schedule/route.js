import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScheduledScrape from '@/lib/models/ScheduledScrape';
import AuditLog from '@/lib/models/AuditLog';

const MAX_SCHEDULES = 5;

/**
 * @swagger
 * /api/schedule:
 *   get:
 *     summary: List user's scheduled scrapes
 *     tags: [Schedule]
 *   post:
 *     summary: Create a scheduled scrape (max 5 per user)
 *     tags: [Schedule]
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();
    const schedules = await ScheduledScrape.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ success: true, schedules });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();

    // Enforce max 5 schedules per user
    const count = await ScheduledScrape.countDocuments({ userId: session.user.id });
    if (count >= MAX_SCHEDULES) {
      return Response.json({ error: `Maximum ${MAX_SCHEDULES} schedules allowed` }, { status: 400 });
    }

    const body = await request.json();
    const { url, layer, extractionType, schedule, notifyEmail, authConfig } = body;

    if (!url || !layer || !extractionType || !schedule) {
      return Response.json({ error: 'url, layer, extractionType and schedule are required' }, { status: 400 });
    }

    const nextRun = ScheduledScrape.computeNextRun(schedule);

    const newSchedule = await ScheduledScrape.create({
      userId: session.user.id,
      url,
      layer,
      extractionType,
      schedule,
      nextRun,
      notifyEmail: notifyEmail || null,
      authConfig: authConfig || null,
    });

    await AuditLog.create({
      userId: session.user.id,
      action: 'schedule_create',
      target: url,
      layer,
      metadata: { schedule, extractionType },
    });

    return Response.json({ success: true, schedule: newSchedule }, { status: 201 });
  } catch (error) {
    console.error('Schedule create error:', error);
    return Response.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
