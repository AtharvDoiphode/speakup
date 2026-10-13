// Scenes from the Round 1 design (ScenarioPicker.dc.html)

export const CATEGORIES = ['Professional', 'Friends and family', 'Everyday life'];

// "Make it your own" options on the picker
export const EXTRA_TRAITS = ['Patient', 'Blunt', 'Chatty', 'Formal', 'Funny', 'Impatient'];
export const MOODS = ['Cheerful', 'Neutral', 'Stressed', 'Annoyed'];

export const SCENARIOS = [
  // Professional
  {
    id: 'job-interview', category: 'Professional', title: 'Job interview', minutes: 12,
    who: 'Ms. Rao', role: 'Hiring manager', roleLong: 'Hiring manager, Finlytics, Pune',
    traits: ['Direct', 'Warm', 'Digs into numbers'],
    brief: 'You are interviewing for a senior analyst role. Ms. Rao has read your CV and wants specific stories, not job descriptions.',
    practise: ['Past tense for what you did', 'Linking ideas: because, so, which meant', 'Answering in under a minute'],
  },
  {
    id: 'salary', category: 'Professional', title: 'Salary conversation', minutes: 10,
    who: 'Mr. Shah', role: 'HR partner', roleLong: 'HR business partner',
    traits: ['Polite', 'Firm', 'Budget-minded'],
    brief: 'You have an offer and want 12% more. Mr. Shah will push back on budget. Hold your number without sounding rude.',
    practise: ['Softeners: I was hoping, would it be possible', 'Conditionals', 'Stating numbers clearly'],
  },
  {
    id: 'explain-delay', category: 'Professional', title: 'Explain a delay', minutes: 8,
    who: 'Mr. Iyer', role: 'Engineering manager', roleLong: 'Engineering manager, your team',
    traits: ['Busy', 'Fair', 'Wants a date'],
    brief: 'The release will slip by a week. Explain why, what you are doing about it, and the new date.',
    practise: ['Past and present perfect', 'Owning a problem without over-apologising', 'Giving a clear next step'],
  },
  {
    id: 'client-call', category: 'Professional', title: 'Client update call', minutes: 10,
    who: 'Sarah Collins', role: 'Client, London', roleLong: 'Head of operations, client in London',
    traits: ['Brisk', 'Friendly', 'British idioms'],
    brief: 'Give a weekly status update to a client who speaks fast and uses idioms. Ask her to repeat when you need to.',
    practise: ['Asking for clarification', 'Summarising progress', 'Future plans with will and going to'],
  },

  // Friends and family
  {
    id: 'old-friend', category: 'Friends and family', title: 'Catching up after years', minutes: 8,
    who: 'Kabir', role: 'School friend', roleLong: 'Friend from school, now in Bengaluru',
    traits: ['Chatty', 'Teasing', 'Curious'],
    brief: 'Kabir calls out of the blue. Tell him what you have been up to since school and ask about his life.',
    practise: ['Present perfect: I have been', 'Small talk and follow-up questions', 'Casual phrasing'],
  },
  {
    id: 'goa-trip', category: 'Friends and family', title: 'Planning a Goa trip', minutes: 8,
    who: 'Riya', role: 'Cousin', roleLong: 'Cousin, organising the trip',
    traits: ['Excited', 'Indecisive', 'Fast talker'],
    brief: 'Agree on dates, budget and who books what. Riya keeps changing her mind.',
    practise: ["Suggestions: how about, why don't we", 'Agreeing and disagreeing', 'Dates and money'],
  },
  {
    id: 'birthday-call', category: 'Friends and family', title: 'Birthday call', minutes: 6,
    who: 'Sunita maasi', role: 'Aunt', roleLong: 'Aunt, lives in New Jersey',
    traits: ['Affectionate', 'Asks many questions'],
    brief: 'Wish your aunt a happy birthday and answer her questions about work and family.',
    practise: ['Warm phrases', 'Talking about family news', 'Polite ways to change topic'],
  },

  // Everyday life
  {
    id: 'doctor', category: 'Everyday life', title: "Doctor's appointment", minutes: 8,
    who: 'Dr. Menon', role: 'General physician', roleLong: 'General physician, Kothrud clinic',
    traits: ['Calm', 'Thorough', 'Asks precise follow-ups'],
    brief: 'You have had a dry cough and mild fever for four days. Describe your symptoms, answer questions, and ask what to do next.',
    practise: ['Describing duration with for and since', 'Body and symptom vocabulary', 'Polite questions: could you, should I'],
  },
  {
    id: 'airport', category: 'Everyday life', title: 'Airport check-in', minutes: 6,
    who: 'Daniel', role: 'Airline staff', roleLong: 'Check-in desk, Heathrow Terminal 2',
    traits: ['Efficient', 'Neutral', 'Rule-bound'],
    brief: 'Your bag is 3 kg over. Ask about options and request an aisle seat.',
    practise: ['Requests and options', 'Numbers and weights', 'Staying polite when frustrated'],
  },
  {
    id: 'product-return', category: 'Everyday life', title: 'Returning a product', minutes: 6,
    who: 'Priya', role: 'Store manager', roleLong: 'Store manager, electronics shop',
    traits: ['Helpful', 'Sceptical'],
    brief: 'Your headphones stopped working after two weeks. You want a refund, not a replacement.',
    practise: ['Explaining a problem', 'Past simple sequence', 'Being firm and polite'],
  },
  {
    id: 'cafe', category: 'Everyday life', title: 'Ordering at a café', minutes: 4,
    who: 'Leo', role: 'Barista', roleLong: 'Barista, Third Wave Coffee',
    traits: ['Friendly', 'Quick'],
    brief: 'Order for yourself and a friend who does not like coffee. Ask about something on the menu.',
    practise: ["Third person: she doesn't", 'Ordering phrases', 'Asking about ingredients'],
  },
];

export const getScenario = (id) => SCENARIOS.find((s) => s.id === id);