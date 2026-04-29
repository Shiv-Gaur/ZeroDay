import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import AuditLog from '@/lib/models/AuditLog';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (session.user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    await dbConnect();
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    return Response.json({ success: true, users });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
