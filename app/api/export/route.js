import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';
import { toJson, toCsv } from '@/lib/utils/export';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { resultId, format } = await request.json();

    if (!resultId) {
      return Response.json({ error: 'resultId is required' }, { status: 400 });
    }
    if (!['json', 'csv'].includes(format)) {
      return Response.json({ error: 'format must be "json" or "csv"' }, { status: 400 });
    }

    await dbConnect();

    const result = await ScrapeResult.findOne({
      _id: resultId,
      userId: session.user.id,
    }).lean();

    if (!result) {
      return Response.json({ error: 'Result not found' }, { status: 404 });
    }

    const data = result.data || [];
    let content, contentType, filename;

    if (format === 'csv') {
      content = toCsv(data);
      contentType = 'text/csv';
      filename = `webscope_${result.layer}_${result.extractionType}_${Date.now()}.csv`;
    } else {
      content = toJson(data);
      contentType = 'application/json';
      filename = `webscope_${result.layer}_${result.extractionType}_${Date.now()}.json`;
    }

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
