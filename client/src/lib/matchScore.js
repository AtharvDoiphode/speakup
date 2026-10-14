// Lowercase words without punctuation. Apostrophes are dropped rather than split on,
// so "doesn't" and speech-to-text's "doesnt" count as the same word.
const words = (s) =>
  s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

// How many words of the target were said, in order (longest common subsequence)
export function matchScore(target, said) {
  const a = words(target);
  const b = words(said);
  const dp = new Array(b.length + 1).fill(0);
  for (const x of a) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = x === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return { matched: dp[b.length], total: a.length };
}