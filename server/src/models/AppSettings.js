import mongoose from 'mongoose';

// App-wide settings: one document, created the first time it's read
const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    signupCode: { type: String, default: '' },
  },
  { timestamps: true }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

// The family signup code. Seeded from SIGNUP_CODE the first time, so existing setups keep working.
export async function getSignupCode() {
  const doc = await AppSettings.findOne({ key: 'main' }).lean();
  if (doc?.signupCode) return doc.signupCode;
  const fromEnv = process.env.SIGNUP_CODE ?? '';
  if (fromEnv) await AppSettings.updateOne({ key: 'main' }, { $set: { signupCode: fromEnv } }, { upsert: true });
  return fromEnv;
}

export async function setSignupCode(code) {
  await AppSettings.updateOne({ key: 'main' }, { $set: { signupCode: code } }, { upsert: true });
  return code;
}

export default AppSettings;
