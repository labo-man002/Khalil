import { profile, url } from '../lib/site';
export async function GET({ site }: { site: URL }) {
  const posts: any[] = Object.values(import.meta.glob('./writing/*.md', { eager: true }));
  posts.sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));
  const xml = (s: string) => s.replace(/[<>&'\"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]!));
  const absolute = (path: string) => new URL(url(path), site).href;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(profile.name)} — Engineering notes</title><link>${xml(absolute('writing/'))}</link><description>Notes on distributed systems, HPC scheduling, and resource allocation.</description><language>en</language>${posts.map(p => `<item><title>${xml(p.frontmatter.title)}</title><link>${xml(absolute(`writing/${p.frontmatter.slug}/`))}</link><guid>${xml(absolute(`writing/${p.frontmatter.slug}/`))}</guid><description>${xml(p.frontmatter.description)}</description><pubDate>${new Date(p.frontmatter.date + 'T12:00:00Z').toUTCString()}</pubDate></item>`).join('')}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
