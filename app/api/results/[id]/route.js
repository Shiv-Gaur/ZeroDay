import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const result = await ScrapeResult.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!result) {
      return Response.json({ error: 'Result not found' }, { status: 404 });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('Result fetch error:', error);
    return Response.json({ error: 'Failed to fetch result' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const result = await ScrapeResult.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return Response.json({ error: 'Result not found' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Result deleted' });
  } catch (error) {
    console.error('Result delete error:', error);
    return Response.json({ error: 'Failed to delete result' }, { status: 500 });
  }
}
