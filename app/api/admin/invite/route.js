import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import InviteCode from '@/lib/models/InviteCode';
import { randomBytes } from 'crypto';

/**
 * @swagger
 * /api/admin/invite:
 *   post:
 *     summary: Generate an invite code (admin only)
 *     tags: [Admin]
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (session.user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    await dbConnect();

    const code = randomBytes(12).toString('hex').toUpperCase();
    const invite = await InviteCode.create({
      code,
      createdBy: session.user.id,
    });

    return Response.json({ success: true, code: invite.code }, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Failed to generate invite code' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (session.user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    await dbConnect();
    const invites = await InviteCode.find({ createdBy: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return Response.json({ success: true, invites });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}
