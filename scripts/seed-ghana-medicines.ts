import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import dbConnect from '../lib/mongodb';
import { ghanaMedicineCatalog } from '../lib/ghana-medicine-catalog';
import Medicine from '../models/Medicine';

function makeSku(index: number) {
  return `GH-MED-${String(index + 1).padStart(4, '0')}`;
}

async function seedGhanaMedicines() {
  try {
    await dbConnect();

    let created = 0;
    let updated = 0;

    for (const [index, medicine] of ghanaMedicineCatalog.entries()) {
      const sku = makeSku(index);
      const result = await Medicine.updateOne(
        {
          genericName: medicine.genericName,
          strength: medicine.strength,
          dosageForm: medicine.dosageForm,
        },
        {
          $set: {
            ...medicine,
            name: medicine.name,
            brandName: '',
            manufacturer: 'Ghana pharmacy catalog',
            sku,
            isActive: true,
            createdBy: 'ghana-medicine-seed',
          },
          $setOnInsert: {
            batchNumber: `GH-STOCK-${String(index + 1).padStart(4, '0')}`,
          },
        },
        { upsert: true, runValidators: true }
      );

      if (result.upsertedCount) created += result.upsertedCount;
      else if (result.modifiedCount) updated += result.modifiedCount;
    }

    const total = await Medicine.countDocuments();
    console.log(`Seeded Ghana pharmacy catalog: ${created} created, ${updated} updated.`);
    console.log(`Medicine records now in database: ${total}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Ghana medicines:', error);
    process.exit(1);
  }
}

seedGhanaMedicines();
