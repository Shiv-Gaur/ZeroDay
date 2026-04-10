import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';
import { scrapeDark } from '@/lib/scrapers/dark';
import { checkRateLimit } from '@/lib/utils/rateLimit';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Dark web: admin only
    if (session.user.role !== 'admin') {
      return Response.json({ error: 'Access restricted to admin users' }, { status: 403 });
    }

    // Rate limiting
    const rl = checkRateLimit(session.user.id || session.user.email);
    if (!rl.allowed) {
      return Response.json({
        error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s`,
      }, { status: 429 });
    }

    const body = await request.json();
    const { url, extractionType } = body;

    // Validate URL — must contain .onion for dark web
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }
    if (!url.includes('.onion')) {
      return Response.json({ error: 'Dark web endpoint requires a .onion URL' }, { status: 400 });
    }

    // Validate extraction type
    const validTypes = ['links', 'images', 'headings', 'paragraphs', 'tables', 'meta'];
    if (!validTypes.includes(extractionType)) {
      return Response.json({ error: `Invalid extraction type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Perform scrape
    const result = await scrapeDark(url, extractionType);

    // Save to MongoDB
    await dbConnect();
    const saved = await ScrapeResult.create({
      userId: session.user.id,
      url,
      layer: 'dark',
      extractionType,
      resultCount: result.data.length,
      data: result.data,
      rawHtmlSize: result.rawHtmlSize,
      duration: result.duration,
      status: 'success',
    });

    return Response.json({
      success: true,
      data: result.data,
      count: result.data.length,
      duration: `${result.duration}ms`,
      method: result.method,
      resultId: saved._id,
    });
  } catch (error) {
    console.error('Dark scrape error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Dark web scraping failed',
    }, { status: 500 });
  }
}
