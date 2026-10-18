// India-time date labels shared by Progress and History
const TZ = 'Asia/Kolkata';
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

export const istKey = (d) => keyFmt.format(new Date(d)); // 'YYYY-MM-DD'
// A 'YYYY-MM-DD' key read as that calendar day (noon UTC is the same day everywhere in India)
const fromKey = (key) => new Date(`${key}T12:00:00Z`);

export const dayLabel = (key) => fromKey(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
export const shortDay = (key) => fromKey(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
export const weekday = (key) => fromKey(key).toLocaleDateString('en-GB', { weekday: 'short', timeZone: TZ });
export const timeOf = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
export const longDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });

// "Today", "Yesterday", or "Tue 14 Oct" (with the year when it isn't this year)
export function dayHeading(key, now) {
  const today = istKey(now);
  if (key === today) return 'Today';
  if (key === istKey(now - 86_400_000)) return 'Yesterday';
  const label = dayLabel(key);
  return key.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${key.slice(0, 4)}`;
}
