import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';

/**
 * @swagger
 * /api/analytics:
 *   get:
 *     summary: Get aggregated analytics for current user
 *     tags: [Analytics]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 *       401:
 *         description: Unauthorized
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalScrapes,
      successCount,
      durationAgg,
      layerBreakdown,
      dailyActivity,
      topDomains,
      extractionUsage,
      recentScrapes,
    ] = await Promise.all([
      // Total scrapes
      ScrapeResult.countDocuments({ userId }),

      // Success count
      ScrapeResult.countDocuments({ userId, status: 'success' }),

      // Avg duration
      ScrapeResult.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: null, avg: { $avg: '$duration' }, total: { $sum: '$resultCount' } } },
      ]),

      // Layer breakdown
      ScrapeResult.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$layer',
            count: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
      ]),

      // Daily activity last 30 days
      ScrapeResult.aggregate([
        { $match: { userId: userId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 10 domains
      ScrapeResult.aggregate([
        { $match: { userId: userId } },
        {
          $addFields: {
            domain: {
              $regexFind: { input: '$url', regex: /^https?:\/\/([^\/]+)/i },
            },
          },
        },
        { $group: { _id: '$domain.captures', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { domain: { $arrayElemAt: ['$_id', 0] }, count: 1, _id: 0 } },
      ]),

      // Extraction type usage
      ScrapeResult.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$extractionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Recent 10 scrapes
      ScrapeResult.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('url layer extractionType status resultCount duration createdAt')
        .lean(),
    ]);

    const avgDuration = durationAgg[0]?.avg || 0;
    const totalDataPoints = durationAgg[0]?.total || 0;
    const successRate = totalScrapes > 0 ? Math.round((successCount / totalScrapes) * 100) : 0;

    return Response.json({
      success: true,
      data: {
        totalScrapes,
        successRate,
        avgDuration: Math.round(avgDuration),
        totalDataPoints,
        layerBreakdown,
        dailyActivity,
        topDomains,
        extractionUsage,
        recentScrapes,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
