import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';
import { scrapeDeep } from '@/lib/scrapers/deep';
import { checkRateLimit } from '@/lib/utils/rateLimit';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limiting
    const rl = checkRateLimit(session.user.id || session.user.email);
    if (!rl.allowed) {
      return Response.json({
        error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s`,
      }, { status: 429 });
    }

    const body = await request.json();
    const { url, extractionType, auth } = body;

    // Validate URL
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return Response.json({ error: 'Invalid URL. Must start with http:// or https://' }, { status: 400 });
    }

    // Validate extraction type
    const validTypes = ['links', 'images', 'headings', 'paragraphs', 'tables', 'meta'];
    if (!validTypes.includes(extractionType)) {
      return Response.json({ error: `Invalid extraction type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Build auth config if provided
    let authConfig = null;
    if (auth && auth.loginUrl) {
      authConfig = {
        loginUrl: auth.loginUrl,
        username: auth.username || '',
        password: auth.password || '',
        usernameSelector: auth.usernameSelector || '#username',
        passwordSelector: auth.passwordSelector || '#password',
        submitSelector: auth.submitSelector || '#submit',
      };
    }

    // Perform scrape
    const result = await scrapeDeep(url, extractionType, authConfig);

    // Save to MongoDB
    await dbConnect();
    const saved = await ScrapeResult.create({
      userId: session.user.id,
      url,
      layer: 'deep',
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
    console.error('Deep scrape error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Deep web scraping failed',
    }, { status: 500 });
  }
}
