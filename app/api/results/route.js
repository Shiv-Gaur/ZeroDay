import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const layer = searchParams.get('layer');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * limit;

    await dbConnect();

    const filter = { userId: session.user.id };
    if (layer && ['surface', 'deep', 'dark'].includes(layer)) {
      filter.layer = layer;
    }

    const [results, total] = await Promise.all([
      ScrapeResult.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ScrapeResult.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    return Response.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    await dbConnect();

    const result = await ScrapeResult.create({
      ...body,
      userId: session.user.id,
    });

    return Response.json({ success: true, result }, { status: 201 });
  } catch (error) {
    console.error('Result save error:', error);
    return Response.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
