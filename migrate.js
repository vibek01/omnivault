const mongoose = require('mongoose');
const fs = require('fs');

const envStr = fs.readFileSync('.env.local', 'utf8');
for (const line of envStr.split('\n')) {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection('vaultitems').updateMany(
    { isPinned: { $exists: false } },
    { $set: { isPinned: false } }
  );
  console.log('Updated documents:', result.modifiedCount);
  process.exit(0);
});
