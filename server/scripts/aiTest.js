import 'dotenv/config';
import { generateJson } from '../src/services/aiService.js';

const result = await generateJson({
  system:
    'You are an English tutor. Correct the learner\'s sentence. ' +
    'Reply as JSON with exactly two keys: "corrected" and "explanation" (one short sentence).',
  prompt: "She don't likes coffee and I am agree with her.",
});

console.log(result);