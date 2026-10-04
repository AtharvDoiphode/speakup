import 'dotenv/config'; // must be the FIRST import so env variables load early
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});