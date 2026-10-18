// One short lesson per mistake type (the same types as MISTAKE_TYPES in prompts/correctionPrompt.js).
// Fixed content, written for Indian learners of English: no AI calls.
// Each lesson: rule (3–5), examples (4, wrong → right), tips (2–3), questions (6, one right answer each).

export const LESSONS = [
  {
    type: 'tense',
    title: 'Tenses: past, present and perfect',
    summary: 'Picking the right time for the verb, especially "have done" and "-ing".',
    rule: [
      'Use the simple present for habits and facts: "I work in Pune."',
      'Use the present continuous for something happening now: "I am working from home this week."',
      'Use the simple past with a finished time: "I met him yesterday." Not "I have met him yesterday."',
      'Use have/has + verb for something that started in the past and continues now: "I have lived here since 2019."',
      'Verbs for states, like know, want, understand and believe, usually don\'t take -ing: "I know him", not "I am knowing him."',
    ],
    examples: [
      { wrong: 'I am knowing the answer.', right: 'I know the answer.', note: '"know" is a state verb: no -ing.' },
      { wrong: 'I have seen that film last week.', right: 'I saw that film last week.', note: '"last week" is a finished time, so use the simple past.' },
      { wrong: 'I am living here since 2019.', right: 'I have been living here since 2019.', note: 'From a past point until now, with "since": have been + -ing.' },
      { wrong: 'Yesterday I go to the bank.', right: 'Yesterday I went to the bank.', note: 'A past time needs a past verb.' },
    ],
    tips: [
      'Yesterday, last week, ago and in 2020 point to the simple past.',
      '"Since" and "for", meaning up to now, usually need have/has.',
      'Before adding -ing, ask: can I see this action happening right now?',
    ],
    questions: [
      { prompt: 'I ___ him since we were in school.', options: ['have known', 'know', 'knew', 'am knowing'], answer: 0, why: '"since" + up to now: have known.' },
      { prompt: 'She ___ to Delhi last month.', options: ['has moved', 'moves', 'moved', 'is moving'], answer: 2, why: '"last month" is a finished time, so the simple past.' },
      { prompt: 'Look! It ___ outside.', options: ['rains', 'is raining', 'rained', 'has rain'], answer: 1, why: 'It is happening right now: is raining.' },
      { prompt: 'Water ___ at 100 degrees Celsius.', options: ['is boiling', 'boiled', 'has boiled', 'boils'], answer: 3, why: 'A general fact takes the simple present.' },
      { prompt: 'We ___ dinner when the lights suddenly went out, so we finished by candlelight.', options: ['had', 'have', 'were having', 'are having'], answer: 2, why: 'You were in the middle of dinner when something happened: were having.' },
      { prompt: 'He ___ English very well.', options: ['understands', 'is understanding', 'understand', 'understanding'], answer: 0, why: '"understand" is a state verb, and "he" takes -s: understands.' },
    ],
  },

  {
    type: 'article',
    title: 'Articles: a, an, the',
    summary: 'Small words that Indian English often drops or adds.',
    rule: [
      'Use "a" or "an" before a singular thing you can count, when it is not specific: "I bought a laptop."',
      'Use "an" before a vowel SOUND, not just a vowel letter: "an hour", "a university".',
      'Use "the" when both of you know which one: "Close the door."',
      'Use no article for general plurals and uncountable ideas: "I like music."',
    ],
    examples: [
      { wrong: 'I have meeting at 5.', right: 'I have a meeting at 5.', note: 'Singular countable noun needs an article.' },
      { wrong: 'She is a honest person.', right: 'She is an honest person.', note: '"honest" starts with a vowel sound.' },
      { wrong: 'I went to the market and bought the vegetables.', right: 'I went to the market and bought vegetables.', note: 'General plural: no article.' },
      { wrong: 'Sun rises in the east.', right: 'The sun rises in the east.', note: 'There is only one sun: use "the".' },
    ],
    tips: [
      'Ask: is it one countable thing? Then it needs a, an or the.',
      'Say the word aloud. If it starts with a vowel sound, use "an".',
    ],
    questions: [
      { prompt: 'She is ___ engineer at a big company.', options: ['a', 'an', 'the', 'no article'], answer: 1, why: '"engineer" starts with a vowel sound, so "an".' },
      { prompt: 'Can you close ___ window, please? It is cold.', options: ['a', 'an', 'the', 'no article'], answer: 2, why: 'You both know which window: "the".' },
      { prompt: 'I want to become ___ doctor.', options: ['a', 'an', 'the', 'no article'], answer: 0, why: 'One of many doctors, not a specific one: "a".' },
      { prompt: 'He waited for ___ hour at the station.', options: ['a', 'an', 'the', 'no article'], answer: 1, why: 'The "h" in "hour" is silent, so it starts with a vowel sound: "an".' },
      { prompt: 'I love ___ music, especially old Hindi songs.', options: ['a', 'an', 'the', 'no article'], answer: 3, why: 'Music in general is uncountable: no article.' },
      { prompt: '___ moon looks huge tonight.', options: ['A', 'An', 'The', 'No article'], answer: 2, why: 'There is only one moon: "the".' },
    ],
  },

  {
    type: 'preposition',
    title: 'Prepositions: in, on, at and friends',
    summary: 'Little words of time and place, and verbs that take a fixed one, or none.',
    rule: [
      'Time: "at" for clock times, "on" for days and dates, "in" for months, years and parts of the day: "at 5 pm", "on Monday", "in July", "in the morning".',
      'Place: "at" for a point, "in" for inside an area, "on" for a surface: "at the station", "in Mumbai", "on the table".',
      'Some verbs take no preposition: discuss, reach, attend, enter. "We discussed the plan", not "discussed about the plan".',
      'Some verbs take a fixed one: depend on, listen to, wait for, married to.',
    ],
    examples: [
      { wrong: 'We discussed about the budget.', right: 'We discussed the budget.', note: '"discuss" takes no preposition.' },
      { wrong: 'I will call you in Monday.', right: 'I will call you on Monday.', note: 'Days take "on".' },
      { wrong: 'She is married with a doctor.', right: 'She is married to a doctor.', note: 'You are married "to" a person.' },
      { wrong: 'We reached to Pune at night.', right: 'We reached Pune at night.', note: '"reach" takes no preposition.' },
    ],
    tips: [
      'Learn a verb together with its partner, as one piece: "depend on", "listen to".',
      'At, on, in go from small to big: at 5 pm, on Monday, in July.',
    ],
    questions: [
      { prompt: 'The meeting is ___ 10 am.', options: ['in', 'on', 'at'], answer: 2, why: 'Clock times take "at".' },
      { prompt: 'My birthday is ___ 14 March.', options: ['in', 'on', 'at'], answer: 1, why: 'Dates take "on".' },
      { prompt: 'Please wait ___ me at the gate.', options: ['to', 'for', 'on', 'at'], answer: 1, why: 'You "wait for" someone.' },
      { prompt: 'Everything depends ___ the weather.', options: ['on', 'of', 'from', 'at'], answer: 0, why: 'The fixed pair is "depend on".' },
      { prompt: 'We will ___ the problem tomorrow.', options: ['discuss about', 'discuss on', 'discuss', 'discuss over'], answer: 2, why: '"discuss" takes no preposition.' },
      { prompt: 'I live ___ Bengaluru.', options: ['in', 'on', 'at'], answer: 0, why: 'Inside a city: "in".' },
    ],
  },

  {
    type: 'subject-verb',
    title: 'Subject–verb agreement',
    summary: 'Matching the verb to who is doing it: he goes, they go.',
    rule: [
      'With he, she, it, or one person or thing, add -s to the verb in the present: "She works", "My phone needs charging".',
      'With I, you, we, they, or plurals, no -s: "They work", "The kids play".',
      'Use "doesn\'t" with he, she and it, and "don\'t" with the others: "He doesn\'t eat meat."',
      'Everyone, nobody, each and every take a singular verb: "Everyone is here."',
      'Find the real subject, not the nearest noun: "The list of names is long."',
    ],
    examples: [
      { wrong: 'He don\'t like spicy food.', right: 'He doesn\'t like spicy food.', note: '"He" takes "doesn\'t".' },
      { wrong: 'My sister work in a bank.', right: 'My sister works in a bank.', note: 'One person: add -s to the verb.' },
      { wrong: 'Everyone have finished.', right: 'Everyone has finished.', note: '"Everyone" is singular.' },
      { wrong: 'The price of onions are high.', right: 'The price of onions is high.', note: 'The subject is "price", not "onions".' },
    ],
    tips: [
      'Cover the words between the subject and the verb, then check that they match.',
      'With he, she and it, the -s goes on the verb, not the noun.',
    ],
    questions: [
      { prompt: 'She ___ to the gym every morning.', options: ['go', 'goes', 'going', 'are going'], answer: 1, why: '"She" + a habit: goes.' },
      { prompt: 'My parents ___ in Nashik.', options: ['lives', 'is living', 'has lived', 'live'], answer: 3, why: '"parents" is plural: live, no -s.' },
      { prompt: 'He ___ know the answer.', options: ['don\'t', 'not', 'doesn\'t', 'isn\'t'], answer: 2, why: '"He" takes "doesn\'t".' },
      { prompt: 'Each of the students ___ a laptop.', options: ['has', 'have', 'are having'], answer: 0, why: '"Each" means one at a time, so it is singular: has.' },
      { prompt: 'The box of mangoes ___ on the table.', options: ['are', 'is', 'were'], answer: 1, why: 'The subject is "box", which is singular.' },
      { prompt: 'Nobody ___ the answer.', options: ['knows', 'know', 'are knowing'], answer: 0, why: '"Nobody" is singular: knows.' },
    ],
  },

  {
    type: 'plural',
    title: 'Plurals and countable nouns',
    summary: 'When to add -s, and words like advice and luggage that never take it.',
    rule: [
      'After numbers above one, and words like many and several, countable nouns are plural: "two friends", "many books".',
      'Some nouns are uncountable and have no plural in English: information, advice, furniture, luggage, equipment, news.',
      'Count uncountable things with "a piece of" or "some": "a piece of advice", "some information".',
      'After "one of", use a plural noun: "one of my friends".',
      'Some plurals are irregular: child → children, person → people, man → men.',
    ],
    examples: [
      { wrong: 'She gave me many advices.', right: 'She gave me a lot of advice.', note: '"advice" is uncountable.' },
      { wrong: 'I have two brother.', right: 'I have two brothers.', note: 'After "two", use the plural.' },
      { wrong: 'He is one of my best friend.', right: 'He is one of my best friends.', note: '"one of" + plural.' },
      { wrong: 'We need more informations.', right: 'We need more information.', note: '"information" is uncountable.' },
    ],
    tips: [
      'If "one advice" or "two luggages" sounds wrong, the word is uncountable.',
      'Remember the group: information, advice, furniture, luggage, equipment, news.',
    ],
    questions: [
      { prompt: 'How many ___ came to the party?', options: ['person', 'peoples', 'people'], answer: 2, why: 'The plural of "person" is "people".' },
      { prompt: 'Can you give me some ___ about the course?', options: ['informations', 'information', 'an information'], answer: 1, why: '"information" is uncountable: no -s, no "an".' },
      { prompt: 'I bought three ___ of bread.', options: ['loaves', 'loaf', 'loafs'], answer: 0, why: 'loaf → loaves, like leaf → leaves.' },
      { prompt: 'She is one of the best ___ in our team.', options: ['player', 'player\'s', 'players'], answer: 2, why: '"one of" + plural: players.' },
      { prompt: 'We have too much ___ for this small car.', options: ['luggage', 'luggages', 'luggage\'s'], answer: 0, why: '"luggage" is uncountable: no -s.' },
      { prompt: 'The ___ are playing in the park.', options: ['childs', 'children', 'childrens'], answer: 1, why: 'The plural of "child" is "children", with no extra -s.' },
    ],
  },

  {
    type: 'word-choice',
    title: 'Word choice',
    summary: 'Picking the word a fluent speaker would use: say or tell, borrow or lend.',
    rule: [
      'You "say" something, and you "tell" someone something: "She said she was tired", "She told me she was tired."',
      '"Borrow" is to take, "lend" is to give: "Can I borrow your pen?", "Can you lend me your pen?"',
      '"Make" is for creating, "do" is for tasks: make tea, make a mistake; do homework, do the dishes.',
      'Watch out for word-for-word translations: "open the light" is "switch on the light" in English.',
    ],
    examples: [
      { wrong: 'He told that he was busy.', right: 'He said that he was busy.', note: '"tell" needs a person after it: "He told me".' },
      { wrong: 'Can you borrow me your charger?', right: 'Can you lend me your charger?', note: 'Giving something for a while is "lend".' },
      { wrong: 'I did a mistake.', right: 'I made a mistake.', note: 'You "make" a mistake.' },
      { wrong: 'Please close the fan.', right: 'Please switch off the fan.', note: 'Machines and lights are switched on and off.' },
    ],
    tips: [
      'When a phrase comes straight from Hindi or Marathi, check how English says it.',
      'Learn the pairs that confuse you together: say/tell, borrow/lend, make/do.',
      'Read the sentence aloud. If it sounds odd, try a simpler word.',
    ],
    questions: [
      { prompt: 'Can you ___ me some money until Friday?', options: ['lend', 'borrow', 'take'], answer: 0, why: 'The other person gives, so "lend".' },
      { prompt: 'She ___ me a funny story.', options: ['said', 'spoke', 'told'], answer: 2, why: 'A person ("me") follows, so "told".' },
      { prompt: 'I have to ___ my homework tonight.', options: ['make', 'do', 'give'], answer: 1, why: 'Homework is a task: "do".' },
      { prompt: 'Please ___ the light. It is dark in here.', options: ['switch on', 'open', 'start'], answer: 0, why: 'Lights are switched on, not opened.' },
      { prompt: 'Could you ___ a photo of us?', options: ['make', 'do', 'take', 'click'], answer: 2, why: 'In standard English you "take" a photo.' },
      { prompt: 'He ___ that he would be late.', options: ['said', 'told', 'talked'], answer: 0, why: 'No person comes after the verb, so "said".' },
    ],
  },

  {
    type: 'word-order',
    title: 'Word order',
    summary: 'Putting words where English expects them, especially in questions.',
    rule: [
      'Statements go subject, verb, object: "I bought a phone."',
      'Direct questions put the helping verb before the subject: "Where are you going?", not "Where you are going?"',
      'Questions without a helping verb use do or does: "What time does the shop open?"',
      'Indirect questions keep statement order: "Can you tell me where the station is?"',
      'Always, often and never go before the main verb, but after "am", "is" and "are": "I always walk", "She is always late."',
    ],
    examples: [
      { wrong: 'Why you are late?', right: 'Why are you late?', note: 'In a question, "are" comes before "you".' },
      { wrong: 'Can you tell me where is the bank?', right: 'Can you tell me where the bank is?', note: 'Indirect question: statement order.' },
      { wrong: 'I go always to work by bus.', right: 'I always go to work by bus.', note: '"always" goes before the main verb.' },
      { wrong: 'What time the shop opens?', right: 'What time does the shop open?', note: 'With no helping verb, add "does".' },
    ],
    tips: [
      'For a question, find the helping verb (is, are, do, can) and put it before the subject.',
      'After "Do you know" or "Can you tell me", the question goes back to statement order.',
    ],
    questions: [
      { prompt: '___ going to the office today?', options: ['You are', 'Are you', 'You'], answer: 1, why: 'A question puts "are" before "you".' },
      { prompt: 'Do you know where ___?', options: ['the station is', 'is the station', 'station is the'], answer: 0, why: 'After "Do you know", use statement order.' },
      { prompt: 'She ___ breakfast.', options: ['skips never', 'never skip', 'never skips'], answer: 2, why: '"never" goes before the main verb, and "she" takes -s.' },
      { prompt: 'Pick the correct question.', options: ['What he wants?', 'What does he want?', 'What wants he?'], answer: 1, why: 'With no helping verb, add "does" before the subject.' },
      { prompt: 'He ___ his phone at home.', options: ['often forgets', 'forgets often', 'often forget'], answer: 0, why: '"often" goes before the main verb, and "he" takes -s.' },
      { prompt: 'Could you tell me what time ___?', options: ['does the train leave', 'leaves the train', 'the train leaves'], answer: 2, why: 'After "Could you tell me", use statement order.' },
    ],
  },

  {
    type: 'spelling',
    title: 'Spelling',
    summary: 'Everyday words that are easy to spell wrong.',
    rule: [
      'Double the last letter before -ing or -ed in short words that end consonant, vowel, consonant: stop → stopping, plan → planned.',
      'Drop the silent "e" before -ing: make → making, write → writing.',
      '"i" before "e", except after "c", works for many words: believe, but receive.',
      'Some words just have to be learned: necessary, separate, definitely, tomorrow, accommodation.',
      'Watch words that sound the same: their, there and they\'re; your and you\'re.',
    ],
    examples: [
      { wrong: 'I will see you tommorow.', right: 'I will see you tomorrow.', note: 'One "m", two "r"s.' },
      { wrong: 'We are writting the report.', right: 'We are writing the report.', note: 'Drop the "e" from "write", and keep one "t".' },
      { wrong: 'I recieved your mail.', right: 'I received your mail.', note: 'After "c", it is "e" before "i".' },
      { wrong: 'She is definately coming.', right: 'She is definitely coming.', note: 'It is "definite" + "ly".' },
    ],
    tips: [
      'Keep a short list of the words you get wrong and look at it once a week.',
      'Break long words into parts: sep-a-rate, nec-es-sa-ry.',
    ],
    questions: [
      { prompt: 'Is it ___ to bring an ID card?', options: ['necessary', 'neccessary', 'necesary'], answer: 0, why: 'One "c", double "s": necessary.' },
      { prompt: 'Keep the two files ___.', options: ['seperate', 'separate', 'separete'], answer: 1, why: 'There is "a rat" in sep-a-rat-e.' },
      { prompt: 'We are ___ a trip to Goa.', options: ['planning', 'planing', 'planeing'], answer: 0, why: '"plan" ends consonant, vowel, consonant, so double the "n".' },
      { prompt: 'The hotel offers free ___.', options: ['accomodation', 'acommodation', 'accommodation'], answer: 2, why: 'Double "c" and double "m": accommodation.' },
      { prompt: 'I don\'t ___ what he said.', options: ['beleive', 'believe', 'belive'], answer: 1, why: '"i" before "e" when there is no "c" before it: believe.' },
      { prompt: 'Leave ___ bags here, please.', options: ['their', 'there', 'they\'re'], answer: 0, why: '"their" means belonging to them.' },
    ],
  },

  {
    type: 'punctuation',
    title: 'Punctuation',
    summary: 'Full stops, commas, question marks and apostrophes.',
    rule: [
      'End a statement with a full stop and a direct question with a question mark: "Where is it?"',
      'Don\'t join two full sentences with only a comma. Use a full stop, or a joining word like "and", "but" or "so".',
      'Use an apostrophe for short forms and for belonging: "it\'s" (it is), "Riya\'s phone".',
      'Plurals don\'t take an apostrophe: "two laptops", not "two laptop\'s".',
      '"its" (belonging to it) has no apostrophe: "The company changed its logo."',
    ],
    examples: [
      { wrong: 'I am tired, I will sleep early.', right: 'I am tired, so I will sleep early.', note: 'Two sentences need a joining word or a full stop.' },
      { wrong: 'Can you send the file.', right: 'Can you send the file?', note: 'A question ends with a question mark.' },
      { wrong: 'The company changed it\'s logo.', right: 'The company changed its logo.', note: '"its" (belonging) has no apostrophe.' },
      { wrong: 'We ordered three pizza\'s.', right: 'We ordered three pizzas.', note: 'A plural takes no apostrophe.' },
    ],
    tips: [
      'Read the sentence aloud: where you stop completely, put a full stop.',
      'Test "it\'s" by saying "it is". If that fits, use the apostrophe.',
    ],
    questions: [
      { prompt: 'Which sentence is punctuated correctly?', options: ['Where do you work.', 'Where, do you work?', 'Where do you work?'], answer: 2, why: 'A direct question ends with a question mark.' },
      { prompt: '___ raining again, so take an umbrella.', options: ['It\'s', 'Its', 'Its\''], answer: 0, why: '"It is raining": the short form is "It\'s".' },
      { prompt: 'The dog wagged ___ tail.', options: ['it\'s', 'its', 'its\''], answer: 1, why: 'Belonging to it: "its", no apostrophe.' },
      { prompt: 'Choose the correct sentence.', options: ['I called her, but she didn\'t answer.', 'I called her, she didn\'t answer.', 'I called her but, she didn\'t answer.'], answer: 0, why: 'Two sentences joined with a comma need "but" after the comma.' },
      { prompt: 'This is ___ bag.', options: ['Priyas', 'Priyas\'', 'Priya\'s'], answer: 2, why: 'Belonging to one person: \'s.' },
      { prompt: 'We sold all the ___.', options: ['ticket\'s', 'tickets', 'tickets\''], answer: 1, why: 'A simple plural takes no apostrophe.' },
    ],
  },

  {
    type: 'capitalization',
    title: 'Capital letters',
    summary: 'Where capitals go in writing: sentence starts, "I", names and days.',
    rule: [
      'Start every sentence with a capital letter.',
      'Always write "I" as a capital, even in the middle of a sentence.',
      'Names of people, places, companies, languages and nationalities take capitals: Riya, Pune, Infosys, Hindi, Indian.',
      'Days, months and festivals take capitals: Monday, July, Diwali. Seasons don\'t: summer, monsoon.',
      'Ordinary nouns stay small in the middle of a sentence: "the manager", "my phone".',
    ],
    examples: [
      { wrong: 'yesterday i met my friend.', right: 'Yesterday I met my friend.', note: 'A capital to start, and "I" is always a capital.' },
      { wrong: 'We will meet on monday.', right: 'We will meet on Monday.', note: 'Days of the week take capitals.' },
      { wrong: 'She speaks english and marathi.', right: 'She speaks English and Marathi.', note: 'Languages take capitals.' },
      { wrong: 'I bought a new Phone last Week.', right: 'I bought a new phone last week.', note: 'Ordinary nouns stay small.' },
    ],
    tips: [
      'Names get capitals, ordinary nouns don\'t.',
      'On a phone, check that autocorrect hasn\'t left a small "i".',
    ],
    questions: [
      { prompt: 'Pick the correctly capitalised sentence.', options: ['My brother and I went to Goa.', 'my brother and i went to goa.', 'My Brother and I went to Goa.'], answer: 0, why: 'A capital to start, for "I" and for the place name, but not for "brother".' },
      { prompt: 'Which word should start with a capital letter?', options: ['summer', 'morning', 'tuesday', 'festival'], answer: 2, why: 'Days of the week take capitals: Tuesday.' },
      { prompt: 'Which of these needs a capital letter?', options: ['india', 'monsoon', 'teacher', 'city'], answer: 0, why: 'Country names take capitals: India.' },
      { prompt: 'My ___ works at a bank.', options: ['Father', 'father', 'Fathers'], answer: 1, why: 'After "my", "father" is an ordinary noun: no capital.' },
      { prompt: 'Last year ___ visited Jaipur.', options: ['I', 'i', 'me'], answer: 0, why: '"I" is always a capital, and it is the subject here.' },
      { prompt: 'Which sentence uses capitals correctly?', options: ['We celebrate holi in march.', 'We Celebrate Holi In March.', 'We celebrate Holi in March.'], answer: 2, why: 'Festivals and months take capitals; other words don\'t.' },
    ],
  },

  {
    type: 'other',
    title: 'Common slips',
    summary: 'Everyday mistakes that don\'t fit one box: extra words, missing verbs, question tags.',
    rule: [
      'Don\'t double up words that mean the same: "return back" is just "return", "repeat again" is just "repeat".',
      'Every sentence needs a verb: "She very happy" should be "She is very happy."',
      'A question tag copies the helping verb and the subject: "You are coming, aren\'t you?", "He can swim, can\'t he?" Not "isn\'t it?" every time.',
      '"Itself" and "only" aren\'t used for emphasis in standard English: "today itself" is just "today".',
    ],
    examples: [
      { wrong: 'Please revert back by Friday.', right: 'Please reply by Friday.', note: '"revert" means go back to something. For an answer, say "reply".' },
      { wrong: 'She very good at maths.', right: 'She is very good at maths.', note: 'The sentence needs a verb: "is".' },
      { wrong: 'You are coming tomorrow, isn\'t it?', right: 'You are coming tomorrow, aren\'t you?', note: 'Copy "are" and "you" into the tag.' },
      { wrong: 'I will finish it today itself.', right: 'I will finish it today.', note: '"itself" isn\'t used for emphasis.' },
    ],
    tips: [
      'If you add a word for emphasis, check whether the sentence works without it.',
      'For a question tag, look at the helping verb and the subject, then flip them: "She can swim, can\'t she?"',
    ],
    questions: [
      { prompt: 'They will ___ on Monday.', options: ['return back', 'return', 'return again back'], answer: 1, why: '"return" already means come back.' },
      { prompt: 'He is from Chennai, ___?', options: ['isn\'t he', 'isn\'t it', 'is it'], answer: 0, why: 'The subject is "he" and the verb is "is": isn\'t he?' },
      { prompt: 'Could you ___ the question, please?', options: ['repeat again', 'again repeat', 'repeat'], answer: 2, why: '"repeat" already means say again.' },
      { prompt: 'Pick the complete sentence.', options: ['My manager is very strict.', 'My manager very strict.', 'My manager being very strict.'], answer: 0, why: 'A sentence needs a full verb: "is".' },
      { prompt: 'Please ___ to this email by Friday.', options: ['revert', 'reply', 'revert back'], answer: 1, why: 'To answer an email is to "reply".' },
      { prompt: 'You can swim, ___?', options: ['can\'t you', 'isn\'t it', 'don\'t you'], answer: 0, why: 'Copy "can" and "you" into the tag: can\'t you?' },
    ],
  },
];

export const getLesson = (type) => LESSONS.find((l) => l.type === type);
