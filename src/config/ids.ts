/** Kurze, kollisionsarme IDs ohne zusätzliche Abhängigkeit. */
export function newId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${random}`;
}
