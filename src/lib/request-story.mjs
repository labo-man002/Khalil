/** Illustrative inventory from the article; coordinate placement, not a live scheduler. */
export const inventory = [
  { node: 11, gpu: 71, x: 0, free: false },
  { node: 12, gpu: 87, x: 1, free: true },
  { node: 13, gpu: 91, x: 2, free: true },
  { node: 14, gpu: 95, x: 3, free: true },
];
export function chooseUnits(policy, nodes = inventory, count = 2) {
  if (!['pack', 'spread'].includes(policy)) throw new Error('Unknown policy');
  const occupied = nodes.filter(n => !n.free);
  const distance = n => occupied.length ? Math.min(...occupied.map(o => Math.abs(n.x - o.x))) : 0;
  return nodes.filter(n => n.free).sort((a, b) =>
    (policy === 'pack' ? 1 : -1) * (distance(a) - distance(b)) || a.node - b.node
  ).slice(0, count).map(n => n.gpu);
}
