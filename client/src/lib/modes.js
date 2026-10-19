// Interview and debate helpers shared by Practice, the Live screen and the transcript

export const MODE_LABEL = { interview: 'Interview', debate: 'Debate' };
export const SCORE_TITLE = { interview: 'Interview readiness', debate: 'Debate score' };

export const isTurnMode = (c) => c?.mode === 'interview' || c?.mode === 'debate';
export const turnWord = (mode) => (mode === 'debate' ? 'Round' : 'Question');

// Where an interview or debate is: answers given, the total, and the next turn's label
export function turnInfo(c) {
  const total = c.modeConfig?.totalTurns ?? (c.mode === 'debate' ? 5 : 10);
  const answered = (c.messages ?? []).filter((m) => m.role === 'user').length;
  const done = answered >= total;
  const current = Math.min(answered + 1, total);
  return { total, answered, done, current, label: `${turnWord(c.mode)} ${current} of ${total}` };
}

// The same role or motion again, as a fresh session
export const againBody = (c) =>
  c.mode === 'interview'
    ? { mode: 'interview', role: c.modeConfig.role, focus: c.modeConfig.focus, difficulty: c.difficulty }
    : { mode: 'debate', topic: c.modeConfig.topic, stance: c.modeConfig.stance, difficulty: c.difficulty };

export const DIFFICULTIES = [
  { value: 'friendly', label: 'Friendly', note: 'Speaks simply and slowly, and helps you find words.' },
  { value: 'neutral', label: 'Neutral', note: 'Normal pace, like a real conversation.' },
  { value: 'tough', label: 'Tough', note: 'Brisk. Pushes on vague answers and asks harder follow-ups.' },
];
