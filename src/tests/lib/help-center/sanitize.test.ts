import { describe, expect, test } from 'vitest'
import { sanitizeArticleHtml } from '@/lib/help-center/sanitize'

describe('sanitizeArticleHtml', () => {
  test('strips script tags', () => {
    const input = '<p>Hello</p><script>alert(1)</script>'
    expect(sanitizeArticleHtml(input)).toBe('<p>Hello</p>')
  })

  test('strips event handlers', () => {
    const input = '<a href="https://example.com" onclick="alert(1)">link</a>'
    const out = sanitizeArticleHtml(input)
    expect(out).not.toContain('onclick')
    expect(out).toContain('href="https://example.com"')
  })

  test('strips javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">x</a>'
    expect(sanitizeArticleHtml(input)).not.toContain('javascript:')
  })

  test('preserves allowed markup', () => {
    const input = '<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>Item</li></ul>'
    const out = sanitizeArticleHtml(input)
    expect(out).toContain('<h2>Title</h2>')
    expect(out).toContain('<strong>Bold</strong>')
    expect(out).toContain('<em>italic</em>')
    expect(out).toContain('<li>Item</li>')
  })

  test('adds rel and target on links', () => {
    const input = '<a href="https://example.com">x</a>'
    const out = sanitizeArticleHtml(input)
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })

  test('strips iframes', () => {
    const input = '<p>x</p><iframe src="https://evil.example"></iframe>'
    expect(sanitizeArticleHtml(input)).not.toContain('iframe')
  })

  test('allows safe img tags', () => {
    const input = '<img src="https://example.com/a.png" alt="x" />'
    expect(sanitizeArticleHtml(input)).toContain('<img')
  })
})
