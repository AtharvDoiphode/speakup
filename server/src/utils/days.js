// India-time days, shared by the Dashboard and Progress so "today", the day buckets
// and the streak always agree. APP_TIMEZONE can change the zone (default Asia/Kolkata).

export const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
export const DAY = 86_400_000;

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayKey = (d) => dayFmt.format(new Date(d)); // 'YYYY-MM-DD' in India time
export const keysBack = (n, now) => Array.from({ length: n }, (_, i) => dayKey(now - (n - 1 - i) * DAY)); // oldest → today
export const toMin = (sec) => Math.round((sec || 0) / 60);

// Calendar arithmetic on 'YYYY-MM-DD' keys (no time zone involved once it's a key)
const keyNum = (key) => Date.parse(`${key}T00:00:00Z`) / DAY;
export const addDays = (key, n) => new Date((keyNum(key) + n) * DAY).toISOString().slice(0, 10);

// From a set of active day keys: the current streak (a quiet today doesn't break it,
// a quiet yesterday does) and the longest run ever
export function streaks(activeKeys, today) {
  const set = activeKeys instanceof Set ? activeKeys : new Set(activeKeys);
  let streak = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of [...set].sort()) {
    run = prev && keyNum(k) - keyNum(prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { streak, bestStreak: Math.max(best, streak) };
}
