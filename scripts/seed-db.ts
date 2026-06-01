// Load environment variables from .env.local BEFORE any other imports
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import mongoose from 'mongoose';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import Report from '../models/Report';
import dbConnect from '../lib/mongodb';
import bcrypt from 'bcryptjs';

const DEMO_PASSWORD = 'Aidoc@2026!';

const demoProviderProfile = {
  hasImage: true,
  image: 'demo-profile-photo',
  licenseNumber: 'DEMO-LICENSE-2026',
  licenseCertificate: {
    fileName: 'demo-license.pdf',
    fileType: 'application/pdf',
    data: 'demo-license-certificate',
    uploadedAt: new Date(),
  },
  approvalStatus: 'approved' as const,
  approvalMethod: 'manual' as const,
  approvedBy: 'seed',
  approvedAt: new Date(),
  licenseVerification: {
    status: 'verified' as const,
    method: 'manual' as const,
    checkedAt: new Date(),
    message: 'Seeded demo account.',
    reference: 'seed-demo',
  },
};

async function upsertDemoUser({
  email,
  name,
  role,
  provider = false,
}: {
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'staff' | 'nurse' | 'hospital' | 'pharmacy';
  provider?: boolean;
}) {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
  const update: Record<string, unknown> = {
    email,
    name,
    role,
    password: hashedPassword,
    approvalStatus: 'approved',
  };

  if (provider) {
    Object.assign(update, demoProviderProfile);
  }

  await User.findOneAndUpdate(
    { email },
    { $set: update },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );
  console.log(`Seeded ${role} demo user: ${email}`);
}

async function seedDatabase() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await Report.deleteMany({});
    console.log('Cleared existing data');

    await upsertDemoUser({ email: 'admin@aidoc.com', name: 'Admin User', role: 'admin' });
    await upsertDemoUser({ email: 'doctor@aidoc.com', name: 'Dr. Demo User', role: 'doctor', provider: true });
    await upsertDemoUser({ email: 'staff@aidoc.com', name: 'Demo Staff', role: 'staff', provider: true });
    await upsertDemoUser({ email: 'nurse@aidoc.com', name: 'Demo Nurse', role: 'nurse', provider: true });
    await upsertDemoUser({ email: 'hospital@aidoc.com', name: 'Demo Hospital', role: 'hospital' });
    await upsertDemoUser({ email: 'pharmacy@aidoc.com', name: 'Demo Pharmacy', role: 'pharmacy' });

    // Create requested admin account
    const requestedAdminEmail = (process.env.ADMIN_EMAIL || 'info@qwesi.org').toLowerCase().trim();
    const requestedAdminPassword = process.env.ADMIN_PASSWORD || 'Qwesi@123';
    const existingRequestedAdmin = await User.findOne({ email: requestedAdminEmail });
    const hashedRequestedAdminPassword = await bcrypt.hash(requestedAdminPassword, 12);
    if (!existingRequestedAdmin) {
      const requestedAdmin = new User({
        email: requestedAdminEmail,
        name: 'Qwesi Admin',
        role: 'admin',
        password: hashedRequestedAdminPassword,
      });
      await requestedAdmin.save();
      console.log(`Created requested admin user: ${requestedAdminEmail}`);
    } else {
      existingRequestedAdmin.role = 'admin';
      existingRequestedAdmin.password = hashedRequestedAdminPassword;
      await existingRequestedAdmin.save();
      console.log(`Updated requested admin user: ${requestedAdminEmail}`);
    }

    // Create sample patients
    const patients = [
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+1-555-0101',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'female' as const,
        address: '123 Main St, Anytown, USA',
        emergencyContact: {
          name: 'John Johnson',
          phone: '+1-555-0102',
          relationship: 'Spouse'
        },
        medicalHistory: ['Hypertension', 'Diabetes Type 2'],
        allergies: ['Penicillin', 'Peanuts'],
        currentMedications: ['Metformin', 'Lisinopril'],
        bloodType: 'A+' as const,
        insuranceProvider: 'Blue Cross Blue Shield',
        insuranceNumber: 'BCBS123456',
        assignedDoctor: 'Dr. Demo User'
      },
      {
        name: 'Michael Chen',
        email: 'michael.chen@email.com',
        phone: '+1-555-0201',
        dateOfBirth: new Date('1990-07-22'),
        gender: 'male' as const,
        address: '456 Oak Ave, Somewhere, USA',
        emergencyContact: {
          name: 'Lisa Chen',
          phone: '+1-555-0202',
          relationship: 'Sister'
        },
        medicalHistory: ['Asthma'],
        allergies: ['Dust', 'Pollen'],
        currentMedications: ['Albuterol'],
        bloodType: 'O+' as const,
        insuranceProvider: 'Aetna',
        insuranceNumber: 'AET789012',
        assignedDoctor: 'Dr. Demo User'
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@email.com',
        phone: '+1-555-0301',
        dateOfBirth: new Date('1988-11-08'),
        gender: 'female' as const,
        address: '789 Pine Rd, Elsewhere, USA',
        emergencyContact: {
          name: 'Robert Davis',
          phone: '+1-555-0302',
          relationship: 'Father'
        },
        medicalHistory: ['Migraine', 'Anxiety'],
        allergies: ['Sulfa drugs'],
        currentMedications: ['Sumatriptan', 'Sertraline'],
        bloodType: 'B-' as const,
        insuranceProvider: 'Cigna',
        insuranceNumber: 'CIG345678',
        assignedDoctor: 'Dr. Demo User'
      }
    ];

    // Create patients one by one to trigger pre-save hook for patientId generation
    const createdPatients = [];
    for (const patientData of patients) {
      const patient = new Patient(patientData);
      await patient.save();
      createdPatients.push(patient);
    }
    console.log(`Created ${createdPatients.length} patients`);

    // Demo patient portal login (Patient model with bcrypt password; same pattern as staff/admin)
    const hashedPatientPortalPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
    const demoPortalPatient = new Patient({
      name: 'Demo Patient',
      email: 'patient@aidoc.com',
      phone: '+1-555-0199',
      dateOfBirth: new Date('1992-05-15'),
      gender: 'female' as const,
      address: '100 Demo Avenue, Demo City, USA',
      emergencyContact: {
        name: 'Demo Contact',
        phone: '+1-555-0198',
        relationship: 'Family'
      },
      medicalHistory: [],
      allergies: [],
      currentMedications: [],
      bloodType: 'O+' as const,
      insuranceProvider: 'Demo Insurance',
      insuranceNumber: 'DEMO123',
      assignedDoctor: 'Dr. Demo User',
      password: hashedPatientPortalPassword,
    });
    await demoPortalPatient.save();
    console.log('Created demo patient portal account: patient@aidoc.com');

    // Create sample appointments
    const appointments = [
      {
        patientName: 'Sarah Johnson',
        patientEmail: 'sarah.johnson@email.com',
        patientPhone: '+1-555-0101',
        doctorName: 'Dr. Demo User',
        doctorEmail: 'doctor@aidoc.com',
        appointmentDate: new Date(),
        appointmentTime: '09:00 AM',
        appointmentType: 'consultation' as const,
        status: 'confirmed' as const,
        notes: 'Follow-up for diabetes management',
        symptoms: ['Fatigue', 'Increased thirst'],
        diagnosis: 'Diabetes Type 2',
        treatment: 'Continue Metformin, monitor blood sugar'
      },
      {
        patientName: 'Michael Chen',
        patientEmail: 'michael.chen@email.com',
        patientPhone: '+1-555-0201',
        doctorName: 'Dr. Demo User',
        doctorEmail: 'doctor@aidoc.com',
        appointmentDate: new Date(),
        appointmentTime: '10:30 AM',
        appointmentType: 'follow-up' as const,
        status: 'confirmed' as const,
        notes: 'Asthma control check',
        symptoms: ['Wheezing', 'Shortness of breath'],
        diagnosis: 'Asthma',
        treatment: 'Continue Albuterol, avoid triggers'
      },
      {
        patientName: 'Emily Davis',
        patientEmail: 'emily.davis@email.com',
        patientPhone: '+1-555-0301',
        doctorName: 'Dr. Demo User',
        doctorEmail: 'doctor@aidoc.com',
        appointmentDate: new Date(),
        appointmentTime: '02:00 PM',
        appointmentType: 'consultation' as const,
        status: 'scheduled' as const,
        notes: 'New patient consultation',
        symptoms: ['Headaches', 'Nausea'],
        diagnosis: 'Migraine',
        treatment: 'Prescribe Sumatriptan, lifestyle modifications'
      }
    ];

    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`Created ${createdAppointments.length} appointments`);

    // Create sample reports
    const reports = [
      {
        patientId: createdPatients[0]._id.toString(),
        patientName: 'Sarah Johnson',
        doctorId: 'demo-user',
        doctorName: 'Dr. Demo User',
        reportType: 'lab' as const,
        reportDate: new Date(),
        status: 'completed' as const,
        findings: 'Blood glucose levels elevated, HbA1c at 8.2%',
        diagnosis: 'Poorly controlled diabetes',
        recommendations: 'Increase Metformin dosage, strict diet control, regular exercise',
        priority: 'high' as const,
        notes: 'Patient needs immediate intervention'
      },
      {
        patientId: createdPatients[1]._id.toString(),
        patientName: 'Michael Chen',
        doctorId: 'demo-user',
        doctorName: 'Dr. Demo User',
        reportType: 'diagnostic' as const,
        reportDate: new Date(),
        status: 'pending' as const,
        findings: 'Lung function test shows mild obstruction',
        diagnosis: 'Mild asthma exacerbation',
        recommendations: 'Increase Albuterol frequency, consider steroid inhaler',
        priority: 'medium' as const,
        notes: 'Schedule follow-up in 2 weeks'
      },
      {
        patientId: createdPatients[2]._id.toString(),
        patientName: 'Emily Davis',
        doctorId: 'demo-user',
        doctorName: 'Dr. Demo User',
        reportType: 'diagnostic' as const,
        reportDate: new Date(),
        status: 'in-progress' as const,
        findings: 'Neurological examination normal, MRI scheduled',
        diagnosis: 'Suspected migraine with aura',
        recommendations: 'Complete MRI, start preventive medication',
        priority: 'medium' as const,
        notes: 'Awaiting MRI results'
      }
    ];

    const createdReports = await Report.insertMany(reports);
    console.log(`Created ${createdReports.length} reports`);

    console.log('Database seeded successfully!');
    console.log(`Demo password for aidoc.com accounts: ${DEMO_PASSWORD}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
