// The browser tab title for each page ("Practice · SpeakUp")
const TITLES = [
  [/^\/$/, 'Home'],
  [/^\/login$/, 'Log in'],
  [/^\/practice$/, 'Practice'],
  [/^\/practice\/[^/]+$/, 'Conversation'],
  [/^\/writing$/, 'Writing'],
  [/^\/writing\/[^/]+$/, 'Writing feedback'],
  [/^\/read-aloud$/, 'Read Aloud'],
  [/^\/grammar$/, 'Grammar'],
  [/^\/grammar\/mine$/, 'Your mistakes quiz'],
  [/^\/grammar\/[^/]+$/, 'Grammar lesson'],
  [/^\/vocabulary$/, 'Vocabulary'],
  [/^\/vocabulary\/review$/, 'Word review'],
  [/^\/progress$/, 'Progress'],
  [/^\/history$/, 'History'],
  [/^\/history\/[^/]+$/, 'Transcript'],
  [/^\/settings$/, 'Settings'],
  [/^\/family$/, 'Family'],
];

export const pageName = (pathname) => TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Page not found';
export const titleFor = (pathname) => `${pageName(pathname)} · SpeakUp`;
