// Spaced repetition with Leitner boxes. Pure functions: no database, easy to test.
//
// A card sits in a box from 0 to 5. Knowing it moves it up, and each box waits
// longer before the card comes back. Forgetting it sends it back to box 0.

export const INTERVALS = [0, 1, 3, 7, 14, 30]; // days, by box
export const MAX_BOX = INTERVALS.length - 1;
export const GRADES = ['again', 'good', 'easy'];
export const AGAIN_MS = 10 * 60_000; // a forgotten card comes back in 10 minutes

const DAY = 86_400_000;
const defaultTz = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';

// The time zone's offset from UTC at a moment, in ms (+5:30 → 19800000)
function offsetMs(t, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(t)).map((x) => [x.type, x.value])
  );
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wall - Math.floor(t / 1000) * 1000;
}

// The calendar day ('YYYY-MM-DD' parts) a moment falls on in the time zone
function dayParts(t, tz) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(t)).split('-').map(Number);
  return { y, m, d };
}

// 00:00 in the time zone, `days` calendar days after the day `now` falls on
export function startOfDay(now, days = 0, tz = defaultTz()) {
  const { y, m, d } = dayParts(now.getTime(), tz);
  const guess = Date.UTC(y, m - 1, d + days); // midnight as if the zone were UTC
  let t = guess - offsetMs(guess, tz);
  const again = guess - offsetMs(t, tz); // re-check, in case the offset differs at that moment
  if (again !== t) t = again;
  return new Date(t);
}

/**
 * The card's new schedule after a review. Returns only the changed fields.
 *  - again: box 0, due in 10 minutes, one more lapse
 *  - good:  up one box; easy: up two (never above 5)
 *  - good/easy: due at the start of the day INTERVALS[box] days from today in the
 *    time zone, so a card reviewed at 9 pm is due tomorrow morning, not tomorrow 9 pm
 */
export function schedule(card, grade, now = new Date(), tz = defaultTz()) {
  if (!GRADES.includes(grade)) throw new Error(`Unknown grade: ${grade}`);
  const box = Math.min(Math.max(Number(card.box) || 0, 0), MAX_BOX);
  const reps = (card.reps || 0) + 1;
  const lapses = card.lapses || 0;

  if (grade === 'again') {
    return { box: 0, dueAt: new Date(now.getTime() + AGAIN_MS), reps, lapses: lapses + 1, lastReviewedAt: now };
  }
  const next = Math.min(box + (grade === 'easy' ? 2 : 1), MAX_BOX);
  return { box: next, dueAt: startOfDay(now, INTERVALS[next], tz), reps, lapses, lastReviewedAt: now };
}

// "in 10 min", "today", "tomorrow", "in 3 days", for the screen.
// Minutes only for a short wait that isn't a day boundary: "good" at 23:30 is due
// at 00:00, half an hour away, but it's "tomorrow" to the learner.
export function nextLabel(dueAt, now = new Date(), tz = defaultTz()) {
  const ms = dueAt.getTime() - now.getTime();
  const atMidnight = startOfDay(dueAt, 0, tz).getTime() === dueAt.getTime();
  if (ms < 60 * 60_000 && !atMidnight) return `in ${Math.max(1, Math.round(ms / 60_000))} min`;
  const days = Math.round((startOfDay(dueAt, 0, tz) - startOfDay(now, 0, tz)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
