// The plain-English line at the top of Progress, built from GET /api/progress.
// Pure, so it can be unit tested. It only mentions trends that really exist.

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const num = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

export function progressSummary({ days, totals, trend }) {
  const { minutes = 0, conversations = 0, writingChecks = 0, readingSessions = 0, grammarRounds = 0 } = totals ?? {};
  const active = minutes + conversations + writingChecks + readingSessions + grammarRounds > 0;
  if (!active) return `Nothing in the last ${days} days yet. A 5-minute conversation is a good start.`;

  const parts = [];
  parts.push(
    minutes > 0
      ? `${plural(minutes, 'minute')} over ${days} days${conversations ? ` across ${plural(conversations, 'conversation')}` : ''}.`
      : `No speaking time in the last ${days} days.`
  );

  const extras = [];
  if (writingChecks) extras.push(plural(writingChecks, 'writing check'));
  if (readingSessions) extras.push(plural(readingSessions, 'read-aloud', 'read-alouds'));
  if (grammarRounds) extras.push(plural(grammarRounds, 'grammar round'));
  if (extras.length) parts.push(`Plus ${extras.length > 1 ? `${extras.slice(0, -1).join(', ')} and ${extras.at(-1)}` : extras[0]}.`);

  // Trends: only when both this period and the one before have numbers
  const s = trend?.avgScore ?? {};
  const m = trend?.mistakesPerSession ?? {};
  const clauses = [];
  if (s.current != null && s.previous != null) {
    const d = s.current - s.previous;
    if (d >= 1) clauses.push(`your average score is up ${plural(d, 'point')}`);
    else if (d <= -1) clauses.push(`your average score is down ${plural(-d, 'point')}`);
    else clauses.push(`your average score held steady at ${s.current}`);
  }
  if (m.current != null && m.previous != null && m.current !== m.previous) {
    clauses.push(`mistakes per conversation ${m.current < m.previous ? 'fell' : 'rose'} from ${num(m.previous)} to ${num(m.current)}`);
  }
  if (clauses.length) {
    const text = clauses.join(', and ');
    parts.push(`${text[0].toUpperCase()}${text.slice(1)}.`);
  } else if (s.current != null && s.previous == null) {
    parts.push(`Your average score is ${s.current}.`); // nothing earlier to compare with
  }
  return parts.join(' ');
}
