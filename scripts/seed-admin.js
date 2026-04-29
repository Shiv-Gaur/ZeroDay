#!/usr/bin/env node
/**
 * scripts/seed-admin.js
 * CLI to create the first admin user.
 * Usage: node scripts/seed-admin.js --email admin@local --password yourpass
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string', default: 'Admin' },
  },
});

if (!values.email || !values.password) {
  console.error('Usage: node scripts/seed-admin.js --email <email> --password <password>');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/webscope';

// Inline schema (can't import Next.js modules here)
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
  inviteCode: String,
  lastActive: Date,
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[*] Connected to MongoDB`);

  const existing = await User.findOne({ email: values.email });
  if (existing) {
    await User.findByIdAndUpdate(existing._id, { role: 'admin' });
    console.log(`[*] Existing user ${values.email} promoted to admin`);
  } else {
    const hashed = await bcrypt.hash(values.password, 12);
    await User.create({ name: values.name, email: values.email, password: hashed, role: 'admin' });
    console.log(`[*] Admin user created: ${values.email}`);
  }

  await mongoose.disconnect();
  console.log('[*] Done');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
