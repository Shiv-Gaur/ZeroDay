/**
 * API tests for /api/scrape/* routes.
 * Uses supertest + mongodb-memory-server (configured in jest.setup.js).
 */
import { createMocks } from 'node-mocks-http';

// Mock getServerSession to return a test session
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { POST as surfacePost } from '../../app/api/scrape/surface/route.js';
import { POST as darkPost } from '../../app/api/scrape/dark/route.js';

const mockAdminSession = {
  user: { id: '507f1f77bcf86cd799439011', email: 'admin@test.com', role: 'admin' },
};
const mockUserSession = {
  user: { id: '507f1f77bcf86cd799439012', email: 'user@test.com', role: 'user' },
};

describe('POST /api/scrape/surface', () => {
  test('returns 401 when not authenticated', async () => {
    getServerSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/scrape/surface', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', extractionType: 'links' }),
    });
    const res = await surfacePost(req);
    expect(res.status).toBe(401);
  });

  test('returns 400 for invalid URL', async () => {
    getServerSession.mockResolvedValue(mockAdminSession);
    const req = new Request('http://localhost/api/scrape/surface', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url', extractionType: 'links' }),
    });
    const res = await surfacePost(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 for .onion URL on surface', async () => {
    getServerSession.mockResolvedValue(mockAdminSession);
    const req = new Request('http://localhost/api/scrape/surface', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://test.onion', extractionType: 'links' }),
    });
    const res = await surfacePost(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/scrape/dark', () => {
  test('returns 403 when user is not admin', async () => {
    getServerSession.mockResolvedValue(mockUserSession);
    const req = new Request('http://localhost/api/scrape/dark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://test.onion', extractionType: 'links' }),
    });
    const res = await darkPost(req);
    expect(res.status).toBe(403);
  });
});
