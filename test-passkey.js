const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const passkeys = await db.collection('passkeys').find({}).toArray();
  console.log(JSON.stringify(passkeys, null, 2));
  process.exit(0);
});
