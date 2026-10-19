import { Router } from 'express';
import { listPeople, createPerson, updatePerson, deletePerson } from '../controllers/peopleController.js';
import { INTERVIEW_FOCUSES, DEBATE_TOPICS, INTERVIEW_TURNS, DEBATE_TURNS } from '../data/modes.js';
import { protect } from '../middleware/auth.js';

// /api/people: the learner's own saved people
export const peopleRouter = Router()
  .get('/', protect, listPeople)
  .post('/', protect, createPerson)
  .patch('/:id', protect, updatePerson)
  .delete('/:id', protect, deletePerson);

// /api/modes: what the interview and debate pickers offer
export const modesRouter = Router().get('/', protect, (req, res) => {
  res.json({
    interview: {
      turns: INTERVIEW_TURNS,
      focuses: INTERVIEW_FOCUSES.map(({ value, label, blurb }) => ({ value, label, blurb })),
    },
    debate: {
      turns: DEBATE_TURNS,
      stances: [{ value: 'for', label: 'For' }, { value: 'against', label: 'Against' }],
      topics: DEBATE_TOPICS,
    },
  });
});
