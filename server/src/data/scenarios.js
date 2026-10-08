export const SCENARIOS = [
  {
    id: 'job-interview',
    category: 'Professional',
    title: 'Job interview',
    brief: 'Interview for a junior software developer role. Introduce yourself and answer questions about your skills.',
    persona: {
      name: 'Ms. Rao',
      role: 'Hiring manager at a software company',
      personality: 'Professional and polite. Asks follow-up questions about your answers.',
      setting: 'A job interview for a junior software developer position.',
    },
  },
  {
    id: 'salary-talk',
    category: 'Professional',
    title: 'Asking for a raise',
    brief: 'You want a salary increase. Explain why you deserve it and respond to your manager\'s concerns.',
    persona: {
      name: 'Mr. Kulkarni',
      role: 'The learner\'s manager',
      personality: 'Fair but careful with budgets. Wants a clear reason for every request.',
      setting: 'A one-to-one meeting where the learner asks for a raise.',
    },
  },
  {
    id: 'admission-interview',
    category: 'Professional',
    title: 'University admission interview',
    brief: 'Explain why you chose this course and what you plan to do after graduating.',
    persona: {
      name: 'Dr. Fernandes',
      role: 'Admissions committee member',
      personality: 'Curious and thorough. Asks why you chose the course and what your plans are.',
      setting: 'An interview for a master\'s program.',
    },
  },
  {
    id: 'client-call',
    category: 'Professional',
    title: 'Client call about a delay',
    brief: 'A project is late. Explain the situation and agree on a new deadline.',
    persona: {
      name: 'Ms. Mehta',
      role: 'A client',
      personality: 'Busy and direct. Cares about deadlines and wants clear answers.',
      setting: 'A phone call about a delayed website delivery.',
    },
  },
  {
    id: 'friend-chat',
    category: 'Friends and family',
    title: 'Catching up with a friend',
    brief: 'You meet an old college friend after a long time. Chat naturally about life and work.',
    persona: {
      name: 'Rohan',
      role: 'An old college friend',
      personality: 'Relaxed and funny. Uses casual spoken English and asks about your life.',
      setting: 'Two old friends meeting at a cafe after a long time.',
    },
  },
  {
    id: 'doctor-visit',
    category: 'Everyday life',
    title: 'Visit to the doctor',
    brief: 'Describe your symptoms and answer the doctor\'s questions.',
    persona: {
      name: 'Dr. Sharma',
      role: 'A general physician',
      personality: 'Calm and caring. Asks clear, simple questions one at a time.',
      setting: 'A clinic visit for a fever and a sore throat.',
    },
  },
  {
    id: 'airport-checkin',
    category: 'Everyday life',
    title: 'Airport check-in',
    brief: 'Check in for an international flight and handle questions about your bags.',
    persona: {
      name: 'Ms. D\'Souza',
      role: 'Airline check-in staff',
      personality: 'Friendly but efficient. Needs clear answers to move the line along.',
      setting: 'The check-in counter before an international flight.',
    },
  },
  {
    id: 'restaurant-order',
    category: 'Everyday life',
    title: 'Ordering at a restaurant',
    brief: 'Order a meal, ask about the menu, and handle a small problem with your order.',
    persona: {
      name: 'Aman',
      role: 'A waiter',
      personality: 'Polite and quick. Suggests dishes and checks if everything is fine.',
      setting: 'A busy restaurant on a Saturday evening.',
    },
  },
];

export const findScenario = (id) => SCENARIOS.find((s) => s.id === id);