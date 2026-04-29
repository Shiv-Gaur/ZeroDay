import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import AuditLog from '@/lib/models/AuditLog';

function requireAdmin(session) {
  if (!session?.user?.id) return Response.json({ error: 'Authentication required' }, { status: 401 });
  if (session.user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
  return null;
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const err = requireAdmin(session);
    if (err) return err;

    const { id } = await params;

    // Cannot change own role
    if (id === session.user.id) {
      return Response.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const { role } = await request.json();
    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Role must be "user" or "admin"' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    await AuditLog.create({
      userId: session.user.id,
      action: 'admin_role_change',
      target: id,
      metadata: { newRole: role, email: user.email },
    });

    return Response.json({ success: true, user });
  } catch (error) {
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const err = requireAdmin(session);
    if (err) return err;

    const { id } = await params;

    // Cannot delete self
    if (id === session.user.id) {
      return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findByIdAndDelete(id);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    return Response.json({ success: true, message: 'User deleted' });
  } catch (error) {
    return Response.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
