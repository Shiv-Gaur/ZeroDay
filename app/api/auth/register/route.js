import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import InviteCode from '@/lib/models/InviteCode';
import AuditLog from '@/lib/models/AuditLog';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               inviteCode: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
export async function POST(request) {
  try {
    const { name, email, password, inviteCode } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await dbConnect();

    // Invite code check
    const requireInvite = process.env.REQUIRE_INVITE_CODE === 'true';
    let inviteDoc = null;
    if (requireInvite) {
      if (!inviteCode) {
        return Response.json({ error: 'An invite code is required to register' }, { status: 403 });
      }
      inviteDoc = await InviteCode.findOne({ code: inviteCode.toUpperCase(), isUsed: false });
      if (!inviteDoc) {
        return Response.json({ error: 'Invalid or already-used invite code' }, { status: 403 });
      }
    }

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: 'user',
      inviteCode: inviteCode || null,
    });

    // Mark invite as used
    if (inviteDoc) {
      await InviteCode.findByIdAndUpdate(inviteDoc._id, {
        isUsed: true,
        usedBy: user._id,
      });
    }

    await AuditLog.create({
      userId: user._id,
      action: 'register',
      target: email,
      metadata: { inviteUsed: !!inviteDoc },
    });

    return Response.json(
      { success: true, message: 'Account created. You can now sign in.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: 'Registration failed' }, { status: 500 });
  }
}
