import { z } from 'zod';

// Every setting the server reads, checked once at startup. A bad set stops the server
// with a message naming each problem (never the values, so secrets stay out of logs).
const required = (name) => z.string({ error: `${name} is missing` }).trim().min(1, `${name} is missing`);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is missing' })
    .trim()
    .min(1, 'JWT_SECRET is missing')
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  MONGODB_URI: required('MONGODB_URI'),
  GEMINI_API_KEY: required('GEMINI_API_KEY'),
  ADMIN_EMAIL: required('ADMIN_EMAIL'),
  CLIENT_ORIGIN: required('CLIENT_ORIGIN'),
  SIGNUP_CODE: z.string().trim().min(8, 'SIGNUP_CODE must be at least 8 characters long').optional(),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3-flash-preview'),
  GEMINI_FALLBACK_MODELS: z.string().default('gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.1-flash-lite-preview'),
  APP_TIMEZONE: z.string().trim().min(1).default('Asia/Kolkata'),
});

/** Validates raw env vars; throws one Error listing every problem. MONGO_URI and CLIENT_URL are the older names. */
export function parseEnv(raw) {
  const blank = (v) => (v === undefined || v === '' ? undefined : v);
  const result = schema.safeParse({
    ...raw,
    MONGODB_URI: blank(raw.MONGODB_URI) ?? raw.MONGO_URI,
    CLIENT_ORIGIN: blank(raw.CLIENT_ORIGIN) ?? raw.CLIENT_URL,
    GEMINI_MODEL: blank(raw.GEMINI_MODEL),
    GEMINI_FALLBACK_MODELS: blank(raw.GEMINI_FALLBACK_MODELS),
    APP_TIMEZONE: blank(raw.APP_TIMEZONE),
    PORT: blank(raw.PORT),
    SIGNUP_CODE: blank(raw.SIGNUP_CODE),
    NODE_ENV: blank(raw.NODE_ENV),
  });
  if (!result.success) {
    const key = (i) => String(i.path[0]);
    const problems = result.error.issues.map((i) => `  - ${i.message.startsWith(key(i)) ? i.message : `${key(i)}: ${i.message}`}`);
    throw new Error(`Server settings are not valid:\n${problems.join('\n')}\nSee server/.env.example.`);
  }
  return result.data;
}

/** Validates process.env, writes the cleaned values (with defaults) back, or stops the server. */
export function loadEnv() {
  try {
    Object.assign(process.env, Object.fromEntries(Object.entries(parseEnv(process.env)).map(([k, v]) => [k, String(v)])));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
