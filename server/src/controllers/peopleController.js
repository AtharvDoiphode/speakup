import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import CustomPerson from '../models/CustomPerson.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { EXTRA_TRAITS, MOODS } from '../data/scenarios.js';

export const MAX_PEOPLE = 12;
const MAX_TRAITS = 3;

const fields = {
  name: z.string({ error: 'Give them a name' }).trim().min(1, 'Give them a name').max(30, 'Keep the name under 30 characters'),
  role: z.string({ error: 'Say who they are' }).trim().min(2, 'Say who they are, in a few words').max(60, 'Keep "who they are" under 60 characters'),
  brief: z.string({ error: 'Describe the situation' }).trim().min(10, 'Describe the situation in at least a sentence').max(400, 'Keep the situation under 400 characters'),
  traits: z
    .array(z.enum(EXTRA_TRAITS, { error: `Traits must be from: ${EXTRA_TRAITS.join(', ')}` }), { error: 'Traits must be a list' })
    .max(20, `Pick up to ${MAX_TRAITS} traits`)
    .transform((list) => [...new Set(list)])
    .refine((list) => list.length <= MAX_TRAITS, `Pick up to ${MAX_TRAITS} traits`),
  mood: z.enum(MOODS, { error: `Mood must be one of: ${MOODS.join(', ')}` }),
};
const createSchema = z.object({ ...fields, traits: fields.traits.default([]), mood: fields.mood.default('Neutral') });
const updateSchema = z
  .object({ name: fields.name.optional(), role: fields.role.optional(), brief: fields.brief.optional(), traits: fields.traits.optional(), mood: fields.mood.optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), { error: 'Send something to change' });

// Loads a person only if they belong to the logged-in user; anything else is the same 404
export const findOwnedPerson = async (userId, id) => {
  const person = isValidObjectId(id) ? await CustomPerson.findOne({ _id: id, user: userId }) : null;
  if (!person) throw httpError(404, 'Person not found');
  return person;
};

// GET /api/people
export const listPeople = asyncHandler(async (req, res) => {
  const people = await CustomPerson.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ people, max: MAX_PEOPLE });
});

// POST /api/people
export const createPerson = asyncHandler(async (req, res) => {
  const body = parse(createSchema, req.body ?? {});
  if ((await CustomPerson.countDocuments({ user: req.user._id })) >= MAX_PEOPLE) {
    throw httpError(409, `You can save up to ${MAX_PEOPLE} people`);
  }
  const person = await CustomPerson.create({ user: req.user._id, ...body });
  res.status(201).json({ person });
});

// PATCH /api/people/:id
export const updatePerson = asyncHandler(async (req, res) => {
  const body = parse(updateSchema, req.body ?? {});
  const person = await findOwnedPerson(req.user._id, req.params.id);
  for (const [k, v] of Object.entries(body)) if (v !== undefined) person[k] = v;
  await person.save();
  res.json({ person });
});

// DELETE /api/people/:id (conversations with them stay, with their own copy of the person)
export const deletePerson = asyncHandler(async (req, res) => {
  const person = await findOwnedPerson(req.user._id, req.params.id);
  await person.deleteOne();
  res.json({ deleted: true, id: person.id });
});
