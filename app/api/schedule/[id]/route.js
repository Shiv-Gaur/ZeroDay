import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScheduledScrape from '@/lib/models/ScheduledScrape';
import AuditLog from '@/lib/models/AuditLog';

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const schedule = await ScheduledScrape.findOne({ _id: id, userId: session.user.id });
    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await ScheduledScrape.findByIdAndUpdate(
      id,
      { isActive: body.isActive !== undefined ? body.isActive : schedule.isActive },
      { new: true }
    );

    return Response.json({ success: true, schedule: updated });
  } catch (error) {
    return Response.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const schedule = await ScheduledScrape.findOneAndDelete({ _id: id, userId: session.user.id });
    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await AuditLog.create({
      userId: session.user.id,
      action: 'schedule_delete',
      target: schedule.url,
      layer: schedule.layer,
      metadata: { scheduleId: id },
    });

    return Response.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    return Response.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
