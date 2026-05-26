/**
 * Ensures the configured admin exists as a User with role admin (not only as Patient).
 * If a Patient row uses the same email, reassigns that email so staff login uses User.
 *
 * Run: npx tsx scripts/fix-admin-account.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import bcrypt from 'bcryptjs';
import dbConnect from '../lib/mongodb';
import User from '../models/User';
import Patient from '../models/Patient';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@qwesi.org';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'Qwesi@123';

async function main() {
  await dbConnect();
  const email = ADMIN_EMAIL.toLowerCase().trim();

  const user = await User.findOne({ email });
  const patient = await Patient.findOne({ email });

  console.log('--- fix-admin-account ---');
  console.log('User doc:', user ? { email: user.email, role: user.role, hasPassword: !!user.password } : 'none');
  console.log('Patient doc:', patient ? { email: patient.email, patientId: patient.patientId } : 'none');

  if (patient) {
    const newEmail = `legacy-${patient.patientId || patient._id}@patient.aidoc.local`;
    patient.email = newEmail;
    await patient.save();
    console.log(`Patient email changed: ${email} -> ${newEmail} (frees staff email for User login)`);
  }

  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  if (user) {
    user.role = 'admin';
    user.email = email;
    user.password = hashed;
    await user.save();
    console.log('Updated User: role=admin, password reset to configured value');
  } else {
    await User.create({
      email,
      name: 'Admin User',
      role: 'admin',
      password: hashed,
    });
    console.log(`Created User: admin with configured password for ${email}`);
  }

  console.log(`Done. Login as ${email} / ${DEFAULT_PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
