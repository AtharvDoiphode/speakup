import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { getTokenFromRequest, verifyToken } from '../utils/token.js';

// Only lets logged-in users through, and puts their account on req.user
export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) throw new HttpError(401, 'Not logged in');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new HttpError(401, 'Account no longer exists');

  req.user = user;
  next();
};
