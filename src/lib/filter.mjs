export function matchesPost(post, query = '', tag = 'All') {
  const terms = query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  const haystack = String(post.search).toLocaleLowerCase('en');
  return (tag === 'All' || post.tags.includes(tag)) && terms.every(term => haystack.includes(term));
}
