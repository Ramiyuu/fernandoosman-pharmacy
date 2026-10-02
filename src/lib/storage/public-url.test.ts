import { describe, expect, it } from 'vitest';

import { isAllowedContentImageUrl, publicImageUrl } from './public-url';

const ID = '0b8a6c2e-1d3f-4a5b-8c7d-9e0f1a2b3c4d';

describe('image URLs', () => {
  it('builds site-relative URLs only for paths the server generated', () => {
    expect(publicImageUrl('article-images', `articles/${ID}.webp`)).toBe(`/media/article-images/articles/${ID}.webp`);
    expect(publicImageUrl('article-images', '../../etc/passwd')).toBeNull();
    expect(publicImageUrl('article-images', `articles/${ID}.svg`)).toBeNull();
    expect(publicImageUrl('profile-images', null)).toBeNull();
  });

  it('only allows our own uploaded images inside content', () => {
    expect(isAllowedContentImageUrl(`/media/article-images/articles/${ID}.png`)).toBe(true);
    expect(isAllowedContentImageUrl(`https://evil.example/media/article-images/articles/${ID}.png`)).toBe(false);
    expect(isAllowedContentImageUrl(`//evil.example/media/article-images/articles/${ID}.png`)).toBe(false);
    expect(isAllowedContentImageUrl(`/media/documents/articles/${ID}/${ID}.pdf`)).toBe(false);
    expect(isAllowedContentImageUrl(`/media/article-images/articles/${ID}.png?x=1`)).toBe(false);
    expect(isAllowedContentImageUrl('javascript:alert(1)')).toBe(false);
  });
});
