import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkTorConnection } from '@/lib/utils/tor';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check platform health and Tor connectivity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status
 */
export async function GET() {
  try {
    const tor = await checkTorConnection();
    return Response.json({
      status: 'ok',
      tor: {
        connected: tor.connected,
        latency: tor.latency,
        // Do NOT expose exit node IP in the public response
      },
    });
  } catch (error) {
    return Response.json({ status: 'ok', tor: { connected: false, latency: null } });
  }
}
