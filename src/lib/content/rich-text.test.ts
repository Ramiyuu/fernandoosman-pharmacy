import { describe, expect, it } from 'vitest';

import { annotateHeadings, estimateReadingTime, richTextToPlainText, sanitizeRichText } from './rich-text';

const ALLOWED_IMAGE = '/media/article-images/articles/0b8a6c2e-1d3f-4a5b-8c7d-9e0f1a2b3c4d.webp';
const options = { isAllowedImageSrc: (src: string) => src === ALLOWED_IMAGE };

describe('sanitizeRichText', () => {
  it('bounds footnote text and rejects unsafe anchors and foreign video sources', () => {
    const id = '0b8a6c2e-1d3f-4a5b-8c7d-9e0f1a2b3c4d';
    const doc = sanitizeRichText(
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'footnote', attrs: { id, text: 'a'.repeat(1500), onclick: 'alert(1)' } },
              { type: 'footnote', attrs: { id: '" onclick="alert(1)', text: 'Unsafe' } },
            ],
          },
          { type: 'video', attrs: { src: 'https://attacker.test/track.mp4', title: 'Foreign' } },
          { type: 'video', attrs: { src: `/api/videos/${id}`, title: 'Study video' } },
        ],
      },
      options,
    );
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].content).toHaveLength(1);
    expect(doc.content[0].content?.[0].attrs).toEqual({ id, text: 'a'.repeat(1000) });
    expect(doc.content[1].attrs).toEqual({ src: `/api/videos/${id}`, title: 'Study video' });
  });
  it('keeps allowed structure', () => {
    const doc = sanitizeRichText(
      {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Results' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'HR ', marks: [{ type: 'bold' }] },
              { type: 'inlineMath', attrs: { latex: '0.75' } },
              { type: 'citation', attrs: { refs: '1, 2' } },
            ],
          },
          {
            type: 'callout',
            attrs: { variant: 'key-point' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
          },
          { type: 'image', attrs: { src: ALLOWED_IMAGE, alt: 'Figure', width: 800, height: 400 } },
        ],
      },
      options,
    );
    expect(doc.content.map((node) => node.type)).toEqual(['heading', 'paragraph', 'callout', 'image']);
    expect(doc.content[1].content?.[2].attrs).toEqual({ refs: '1,2' });
  });

  it('drops script-like and unknown nodes, unsafe links and foreign images (XSS)', () => {
    const doc = sanitizeRichText(
      {
        type: 'doc',
        content: [
          { type: 'script', text: 'alert(1)' },
          { type: 'htmlBlock', attrs: { html: '<img src=x onerror=alert(1)>' } },
          {
            type: 'paragraph',
            attrs: { onclick: 'alert(1)', style: 'x' },
            content: [
              { type: 'text', text: 'click', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
              {
                type: 'text',
                text: 'data',
                marks: [{ type: 'link', attrs: { href: 'data:text/html,<script>alert(1)</script>' } }],
              },
              {
                type: 'text',
                text: 'ok',
                marks: [{ type: 'link', attrs: { href: 'https://doi.org/10.1/x', onmouseover: 'x' } }],
              },
              { type: 'text', text: '<script>alert(1)</script>' },
            ],
          },
          { type: 'image', attrs: { src: 'https://tracker.example.com/pixel.gif', alt: '' } },
          { type: 'image', attrs: { src: 'data:image/svg+xml,<svg onload=alert(1)>' } },
          {
            type: 'callout',
            attrs: { variant: '"><script>' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'y' }] }],
          },
        ],
      },
      options,
    );

    const json = JSON.stringify(doc);
    expect(json).not.toContain('javascript:');
    expect(json).not.toContain('data:');
    expect(json).not.toContain('onclick');
    expect(json).not.toContain('onmouseover');
    expect(json).not.toContain('tracker.example.com');
    expect(json).not.toContain('htmlBlock');
    expect(doc.content.map((node) => node.type)).toEqual(['paragraph', 'callout']);
    expect(doc.content[0].attrs).toBeUndefined();
    expect(doc.content[1].attrs).toEqual({ variant: 'info' });
    // Text is kept as text; the renderer escapes it.
    expect(doc.content[0].content?.[3].text).toBe('<script>alert(1)</script>');
    expect(doc.content[0].content?.[2].marks).toEqual([{ type: 'link', attrs: { href: 'https://doi.org/10.1/x' } }]);
  });

  it('returns an empty document for invalid input', () => {
    expect(sanitizeRichText('<p>hi</p>', options)).toEqual({ type: 'doc', content: [] });
    expect(sanitizeRichText(null, options)).toEqual({ type: 'doc', content: [] });
  });

  it('limits nesting depth', () => {
    let node: Record<string, unknown> = { type: 'paragraph', content: [{ type: 'text', text: 'deep' }] };
    for (let index = 0; index < 100; index += 1) node = { type: 'blockquote', content: [node] };
    const doc = sanitizeRichText({ type: 'doc', content: [node] }, options);
    expect(JSON.stringify(doc)).not.toContain('deep');
  });
});

describe('plain text, reading time and headings', () => {
  const doc = sanitizeRichText(
    {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Why this study matters' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'word '.repeat(440) }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Why this study matters' }] },
      ],
    },
    options,
  );

  it('extracts text and estimates reading time', () => {
    const text = richTextToPlainText(doc);
    expect(text.startsWith('Why this study matters')).toBe(true);
    expect(estimateReadingTime(text)).toBe(3);
    expect(estimateReadingTime('')).toBe(1);
  });

  it('assigns unique heading ids', () => {
    const { headings } = annotateHeadings(doc);
    expect(headings.map((heading) => heading.id)).toEqual(['why-this-study-matters', 'why-this-study-matters-2']);
  });
});
