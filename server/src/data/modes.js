// Interview and debate modes: the fixed choices, the turn counts and the partners.
// Plain data, so the picker and the server use the same lists.

export const INTERVIEW_TURNS = 10;
export const DEBATE_TURNS = 5;

export const INTERVIEW_FOCUSES = [
  {
    value: 'hr',
    label: 'HR and behavioural',
    blurb: 'Motivation, strengths, teamwork and stories from your experience.',
    prompt: 'HR and behavioural: motivation, strengths and weaknesses, teamwork, handling conflict, stories from past experience (answers in a situation, action, result shape), and career goals.',
    interviewer: { name: 'Ms. Kapoor', title: 'HR manager' },
  },
  {
    value: 'situational',
    label: 'Situational',
    blurb: '"What would you do if…" questions about real work problems.',
    prompt: 'Situational: realistic "What would you do if..." problems for this role, such as tight deadlines, a difficult customer or colleague, a mistake you made, competing priorities, and small ethical choices.',
    interviewer: { name: 'Mr. Desai', title: 'Hiring manager' },
  },
  {
    value: 'campus',
    label: 'Campus placement',
    blurb: 'For final-year students: projects, internships and HR basics.',
    prompt: 'Campus placement for a fresher: self-introduction, final-year project, internships, favourite subjects, why this company, willingness to learn and relocate, and HR basics. The candidate is a final-year student with little or no work experience, so never ask about years of experience.',
    interviewer: { name: 'Ms. Nair', title: 'Campus recruiter' },
  },
];
export const getFocus = (value) => INTERVIEW_FOCUSES.find((f) => f.value === value);

export const DEBATE_PARTNER = { name: 'Arjun', title: 'Debate partner' };

// Balanced between everyday life and wider social questions, for an Indian audience
export const DEBATE_TOPICS = [
  { id: 'wfh', kind: 'everyday', text: 'Working from home is better than working from the office.' },
  { id: 'phones-class', kind: 'everyday', text: 'Students should be allowed to use phones in college classrooms.' },
  { id: 'online-shopping', kind: 'everyday', text: 'Online shopping is better than shopping at local markets.' },
  { id: 'family-dinner', kind: 'everyday', text: 'Families should eat dinner together with no phones at the table.' },
  { id: 'cooking', kind: 'everyday', text: 'Everyone should learn to cook before they turn eighteen.' },
  { id: 'weekends', kind: 'everyday', text: 'Weekends are better spent at home than travelling.' },
  { id: 'coaching', kind: 'social', text: 'Coaching classes do more harm than good for students.' },
  { id: 'four-day-week', kind: 'social', text: 'A four-day work week would be good for India.' },
  { id: 'social-media', kind: 'social', text: 'Social media does more harm than good to young people.' },
  { id: 'cricket', kind: 'social', text: 'Cricket gets too much attention compared to other sports in India.' },
  { id: 'free-transport', kind: 'social', text: 'Public transport should be free in big cities.' },
  { id: 'exams', kind: 'social', text: 'Exams are not the best way to judge students.' },
];

// The five skills each scorecard rates
export const SCORECARD_SKILLS = {
  interview: [
    { key: 'clarity', label: 'Clarity' },
    { key: 'structure', label: 'Structure' },
    { key: 'relevance', label: 'Relevance' },
    { key: 'vocabulary', label: 'Vocabulary' },
    { key: 'confidence', label: 'Confidence' },
  ],
  debate: [
    { key: 'argument', label: 'Argument strength' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'rebuttal', label: 'Rebuttal' },
    { key: 'fluency', label: 'Fluency' },
    { key: 'politeness', label: 'Politeness' },
  ],
};
