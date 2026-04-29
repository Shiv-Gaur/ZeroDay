import { sanitizeText, sanitizeHtml } from '../../lib/utils/sanitize.js';

describe('sanitize utils', () => {
  test('strips <script> tags', () => {
    const input = '<p>Hello</p><script>alert(1)</script>';
    expect(sanitizeHtml(input)).not.toContain('<script>');
  });

  test('strips on* event handlers', () => {
    const input = '<a href="#" onclick="evil()">click</a>';
    expect(sanitizeHtml(input)).not.toContain('onclick');
  });

  test('strips javascript: URLs', () => {
    const input = '<a href="javascript:void(0)">link</a>';
    expect(sanitizeHtml(input)).not.toContain('javascript:');
  });

  test('strips null bytes', () => {
    const input = 'hello\x00world';
    expect(sanitizeText(input)).not.toContain('\x00');
  });

  test('strips <iframe> tags', () => {
    const input = '<iframe src="evil.html"></iframe>';
    expect(sanitizeHtml(input)).not.toContain('<iframe');
  });

  test('strips <object> tags', () => {
    const input = '<object data="file.swf"></object>';
    expect(sanitizeHtml(input)).not.toContain('<object');
  });

  test('preserves safe content', () => {
    const input = 'Hello, world!';
    expect(sanitizeText(input)).toContain('Hello');
  });
});
