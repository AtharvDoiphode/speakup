export const WORDS = [
  { word: 'deliberate', pos: 'adjective', ipa: '/dɪˈlɪb.ər.ət/', meaning: 'Done on purpose, after careful thought.', example: 'Launching in Pune first was a deliberate choice.' },
  { word: 'concise', pos: 'adjective', ipa: '/kənˈsaɪs/', meaning: 'Short and clear, with no extra words.', example: 'Keep your answer concise: two or three sentences.' },
  { word: 'reluctant', pos: 'adjective', ipa: '/rɪˈlʌk.tənt/', meaning: 'Not wanting to do something.', example: 'She was reluctant to change the plan so late.' },
  { word: 'candid', pos: 'adjective', ipa: '/ˈkæn.dɪd/', meaning: 'Honest and direct, even when it is uncomfortable.', example: 'Thanks for the candid feedback on my draft.' },
  { word: 'thorough', pos: 'adjective', ipa: '/ˈθʌr.ə/', meaning: 'Careful to check every detail.', example: 'The doctor gave me a thorough check-up.' },
  { word: 'meticulous', pos: 'adjective', ipa: '/məˈtɪk.jə.ləs/', meaning: 'Extremely careful and exact.', example: 'He keeps meticulous notes of every meeting.' },
  { word: 'resilient', pos: 'adjective', ipa: '/rɪˈzɪl.i.ənt/', meaning: 'Able to recover quickly from problems.', example: 'Small businesses here are surprisingly resilient.' },
  { word: 'pragmatic', pos: 'adjective', ipa: '/præɡˈmæt.ɪk/', meaning: 'Dealing with things in a practical way.', example: 'Let’s take a pragmatic approach and fix the urgent bug first.' },
  { word: 'elaborate', pos: 'verb', ipa: '/ɪˈlæb.ə.reɪt/', meaning: 'To explain something in more detail.', example: 'Could you elaborate on your last project?' },
  { word: 'anticipate', pos: 'verb', ipa: '/ænˈtɪs.ɪ.peɪt/', meaning: 'To expect something and prepare for it.', example: 'We anticipate a delay of about one week.' },
  { word: 'clarify', pos: 'verb', ipa: '/ˈklær.ɪ.faɪ/', meaning: 'To make something easier to understand.', example: 'Can I clarify what you meant by “next sprint”?' },
  { word: 'convey', pos: 'verb', ipa: '/kənˈveɪ/', meaning: 'To communicate an idea or feeling.', example: 'Your tone conveys confidence.' },
  { word: 'postpone', pos: 'verb', ipa: '/pəʊstˈpəʊn/', meaning: 'To move an event to a later time.', example: 'We had to postpone the trip to December.' },
  { word: 'negotiate', pos: 'verb', ipa: '/nɪˈɡəʊ.ʃi.eɪt/', meaning: 'To discuss something to reach an agreement.', example: 'I want to negotiate a slightly higher salary.' },
  { word: 'feasible', pos: 'adjective', ipa: '/ˈfiː.zə.bəl/', meaning: 'Possible and practical to do.', example: 'Is a Friday release still feasible?' },
  { word: 'versatile', pos: 'adjective', ipa: '/ˈvɜː.sə.taɪl/', meaning: 'Able to do many different things well.', example: 'She is a versatile developer, front end and back end.' },
  { word: 'diligent', pos: 'adjective', ipa: '/ˈdɪl.ɪ.dʒənt/', meaning: 'Hard-working and careful.', example: 'He is diligent about practising every day.' },
  { word: 'articulate', pos: 'adjective', ipa: '/ɑːˈtɪk.jə.lət/', meaning: 'Able to express ideas clearly.', example: 'She gave an articulate answer under pressure.' },
  { word: 'ambiguous', pos: 'adjective', ipa: '/æmˈbɪɡ.ju.əs/', meaning: 'Having more than one possible meaning.', example: 'The email was ambiguous, so I asked again.' },
  { word: 'acknowledge', pos: 'verb', ipa: '/əkˈnɒl.ɪdʒ/', meaning: 'To accept or admit that something is true.', example: 'I acknowledge the mistake and here is the fix.' },
];

// Same word all day, in India time
export function wordOfTheDay(date = new Date()) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
  const dayNumber = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
  return WORDS[dayNumber % WORDS.length];
}