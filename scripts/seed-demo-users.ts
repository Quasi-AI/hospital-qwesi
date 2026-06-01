import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import bcrypt from 'bcryptjs';
import dbConnect from '../lib/mongodb';
import User from '../models/User';

const DEMO_PASSWORD = 'Aidoc@2026!';

const providerFields = {
  hasImage: true,
  image: 'demo-profile-photo',
  licenseNumber: 'DEMO-LICENSE-2026',
  licenseCertificate: {
    fileName: 'demo-license.pdf',
    fileType: 'application/pdf',
    data: 'demo-license-certificate',
    uploadedAt: new Date(),
  },
  approvalStatus: 'approved',
  approvalMethod: 'manual',
  approvedBy: 'seed-demo-users',
  approvedAt: new Date(),
  licenseVerification: {
    status: 'verified',
    method: 'manual',
    checkedAt: new Date(),
    message: 'Seeded demo account.',
    reference: 'seed-demo-users',
  },
};

async function seedDemoUsers() {
  await dbConnect();
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = [
    { email: 'admin@aidoc.com', name: 'Admin User', role: 'admin' },
    { email: 'doctor@aidoc.com', name: 'Dr. Demo User', role: 'doctor', provider: true },
    { email: 'staff@aidoc.com', name: 'Demo Staff', role: 'staff', provider: true },
    { email: 'nurse@aidoc.com', name: 'Demo Nurse', role: 'nurse', provider: true },
    { email: 'hospital@aidoc.com', name: 'Demo Hospital', role: 'hospital' },
    { email: 'pharmacy@aidoc.com', name: 'Demo Pharmacy', role: 'pharmacy', address: 'Demo Pharmacy Location' },
  ];

  for (const user of users) {
    await User.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          email: user.email,
          name: user.name,
          role: user.role,
          password,
          approvalStatus: 'approved',
          ...(user.address ? { address: user.address } : {}),
          ...(user.provider ? providerFields : {}),
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
    console.log(`Seeded ${user.role}: ${user.email}`);
  }

  console.log(`Shared demo password: ${DEMO_PASSWORD}`);
}

seedDemoUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed demo users:', error);
    process.exit(1);
  });
