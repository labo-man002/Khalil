import { projects, url } from '../lib/site';
export async function GET({ site }: { site: URL }) {
  const posts: any[] = Object.values(import.meta.glob('./writing/*.md', { eager: true }));
  const paths = ['', 'about/', 'work/', 'writing/', 'stories/inside-an-allocation/', 'colophon/', ...projects.map(p => `work/${p.slug}/`), ...posts.map(p => `writing/${p.frontmatter.slug}/`)];
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${escape(new URL(url(p), site).href)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
