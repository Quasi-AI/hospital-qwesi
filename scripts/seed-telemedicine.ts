import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import models
import TelemedicineSession from '../models/TelemedicineSession';
import Patient from '../models/Patient';
import User from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define MONGODB_URI environment variable');
  process.exit(1);
}

async function seedTelemedicine() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // Get existing patients and doctors (doctors are users with role 'doctor')
    const patients = await Patient.find().limit(10).lean();
    const doctors = await User.find({ role: 'doctor' }).limit(5).lean();
    const adminUser = await User.findOne({ role: 'admin' }).lean();

    if (patients.length === 0 || doctors.length === 0 || !adminUser) {
      console.error('Please ensure you have patients, doctors, and admin users in the database');
      process.exit(1);
    }

    console.log(`Found ${patients.length} patients and ${doctors.length} doctors`);

    // Clear existing telemedicine sessions
    await TelemedicineSession.deleteMany({});
    console.log('Cleared existing telemedicine sessions');

    const consultationTypes: ('video' | 'audio' | 'chat')[] = ['video', 'audio', 'chat'];
    const statuses = ['scheduled', 'waiting', 'in-progress', 'completed', 'cancelled'];
    const chiefComplaints = [
      'Follow-up consultation',
      'Headache and dizziness',
      'Skin rash',
      'Cold and flu symptoms',
      'Back pain',
      'Anxiety consultation',
      'Medication review',
      'Post-surgery follow-up',
      'Blood pressure monitoring',
      'Diabetes management',
    ];

    const symptoms = [
      ['headache', 'dizziness', 'nausea'],
      ['cough', 'fever', 'body aches'],
      ['rash', 'itching', 'redness'],
      ['fatigue', 'weakness', 'shortness of breath'],
      ['pain', 'swelling', 'stiffness'],
    ];

    const diagnoses = [
      'Viral upper respiratory infection',
      'Tension headache',
      'Contact dermatitis',
      'Generalized anxiety disorder',
      'Hypertension, well-controlled',
      'Type 2 diabetes mellitus',
      'Acute bronchitis',
      'Allergic rhinitis',
    ];

    const sessions = [];
    const now = new Date();
    let sessionCounter = 1;

    // Create sessions for the past week
    for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
      const sessionsPerDay = Math.floor(Math.random() * 5) + 3;

      for (let i = 0; i < sessionsPerDay; i++) {
        const patient = patients[Math.floor(Math.random() * patients.length)];
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];
        const consultationType = consultationTypes[Math.floor(Math.random() * consultationTypes.length)];
        
        // Determine status based on date
        let status;
        if (dayOffset < 0) {
          // Past sessions are mostly completed
          status = Math.random() > 0.1 ? 'completed' : 'cancelled';
        } else if (dayOffset === 0) {
          // Today's sessions have various statuses
          const rand = Math.random();
          if (rand < 0.2) status = 'waiting';
          else if (rand < 0.3) status = 'in-progress';
          else if (rand < 0.6) status = 'completed';
          else status = 'scheduled';
        } else {
          // Future sessions are scheduled
          status = 'scheduled';
        }

        // Generate times
        const sessionDate = new Date(now);
        sessionDate.setDate(sessionDate.getDate() + dayOffset);
        sessionDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 4) * 15, 0, 0);

        const scheduledStartTime = new Date(sessionDate);
        const duration = [15, 30, 45, 60][Math.floor(Math.random() * 4)];
        const scheduledEndTime = new Date(scheduledStartTime.getTime() + duration * 60 * 1000);

        let actualStartTime, actualEndTime;
        if (status === 'completed' || status === 'in-progress') {
          actualStartTime = new Date(scheduledStartTime.getTime() + (Math.random() * 10 - 5) * 60 * 1000);
          if (status === 'completed') {
            actualEndTime = new Date(actualStartTime.getTime() + (duration + Math.floor(Math.random() * 10 - 5)) * 60 * 1000);
          }
        }

        const sessionSymptoms = symptoms[Math.floor(Math.random() * symptoms.length)];

        // Generate session number using the sessionDate already created
        const dateStr = sessionDate.toISOString().slice(0, 10).replace(/-/g, '');
        const sessionNumber = `TM-${dateStr}-${String(sessionCounter++).padStart(4, '0')}`;

        const session: any = {
          sessionNumber,
          patientId: patient._id,
          doctorId: doctor._id,
          consultationType,
          scheduledStartTime,
          scheduledEndTime,
          actualStartTime,
          actualEndTime,
          status,
          roomId: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          participants: [
            {
              odId: patient._id,
              odType: 'patient',
              name: patient.name,
              connectionStatus: status === 'in-progress' ? 'connected' : 'waiting',
              joinedAt: actualStartTime,
            },
            {
              odId: doctor._id,
              odType: 'doctor',
              name: doctor.name,
              connectionStatus: status === 'in-progress' ? 'connected' : 'waiting',
              joinedAt: actualStartTime,
            }
          ],
          chiefComplaint: chiefComplaints[Math.floor(Math.random() * chiefComplaints.length)],
          symptoms: sessionSymptoms,
          consultationFee: [25, 50, 75, 100, 150][Math.floor(Math.random() * 5)],
          currency: 'USD',
          paymentStatus: status === 'completed' ? (Math.random() > 0.2 ? 'paid' : 'pending') : 'pending',
          createdBy: adminUser._id,
          chatMessages: [],
        };

        // Add clinical data for completed sessions
        if (status === 'completed') {
          session.diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
          session.clinicalNotes = `Patient presented with ${sessionSymptoms.join(', ')}. Physical examination findings were within normal limits. ${session.diagnosis} diagnosed. Treatment plan discussed with patient.`;
          session.followUpRequired = Math.random() > 0.5;
          if (session.followUpRequired) {
            const followUpDate = new Date(scheduledStartTime);
            followUpDate.setDate(followUpDate.getDate() + 14);
            session.followUpDate = followUpDate;
          }

          // Add sample chat messages
          session.chatMessages = [
            {
              senderId: patient._id,
              senderType: 'patient',
              senderName: patient.name,
              message: `Hello doctor, I'm experiencing ${sessionSymptoms[0]}.`,
              messageType: 'text',
              timestamp: actualStartTime,
              read: true,
            },
            {
              senderId: doctor._id,
              senderType: 'doctor',
              senderName: doctor.name,
              message: 'Hello! I understand. Can you tell me more about when this started and how severe it is?',
              messageType: 'text',
              timestamp: new Date(actualStartTime.getTime() + 60000),
              read: true,
            },
            {
              senderId: patient._id,
              senderType: 'patient',
              senderName: patient.name,
              message: 'It started about 3 days ago. It\'s moderate but persistent.',
              messageType: 'text',
              timestamp: new Date(actualStartTime.getTime() + 120000),
              read: true,
            },
            {
              senderId: doctor._id,
              senderType: 'doctor',
              senderName: doctor.name,
              message: `Based on your symptoms, I'm diagnosing this as ${session.diagnosis}. I'll prepare a prescription for you.`,
              messageType: 'text',
              timestamp: new Date(actualStartTime.getTime() + 180000),
              read: true,
            },
          ];

          // Add rating for some completed sessions
          if (Math.random() > 0.3) {
            session.patientRating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
            session.patientFeedback = ['Great consultation!', 'Very helpful doctor.', 'Quick and efficient.', 'Excellent care.'][Math.floor(Math.random() * 4)];
          }
        }

        sessions.push(session);
      }
    }

    // Insert all sessions
    const insertedSessions = await TelemedicineSession.insertMany(sessions);
    console.log(`Created ${insertedSessions.length} telemedicine sessions`);

    // Log summary
    const summary = await TelemedicineSession.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\nSession Summary:');
    summary.forEach(s => {
      console.log(`  ${s._id}: ${s.count}`);
    });

    const typeSummary = await TelemedicineSession.aggregate([
      {
        $group: {
          _id: '$consultationType',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\nBy Consultation Type:');
    typeSummary.forEach(s => {
      console.log(`  ${s._id}: ${s.count}`);
    });

    console.log('\nTelemedicine seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding telemedicine:', error);
    process.exit(1);
  }
}

seedTelemedicine();
