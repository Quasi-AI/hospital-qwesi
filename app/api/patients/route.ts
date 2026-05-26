import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await dbConnect();
    const patients = await Patient.find({}).sort({ createdAt: -1 });
    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Debug: Log the incoming data
    console.log('Incoming patient data:', JSON.stringify(body, null, 2));
    
    // Clean up the data: convert empty strings to undefined for optional fields
    const cleanedData: any = {
      name: body.name,
      email: body.email,
      phone: body.phone ? body.phone.trim() : '',
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender || '',
      medicalHistory: body.medicalHistory || [],
      allergies: body.allergies || [],
      currentMedications: body.currentMedications || [],
    };
    
    // Validate required fields
    if (!cleanedData.name || !cleanedData.email || !cleanedData.dateOfBirth || !cleanedData.phone || !cleanedData.gender) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Name, email, date of birth, phone, and gender are required'
      }, { status: 400 });
    }
    
    // Handle password if provided (for patient login)
    if (body.password && body.password.trim()) {
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(body.password, 12);
      cleanedData.password = hashedPassword;
    }
    if (body.address && body.address.trim()) {
      cleanedData.address = body.address.trim();
    }
    if (body.bloodType && body.bloodType.trim() && body.bloodType !== 'none') {
      cleanedData.bloodType = body.bloodType;
    }
    
    // Handle emergency contact - only include if at least one field has a value
    if (body.emergencyContact) {
      const emergencyContact: any = {};
      if (body.emergencyContact.name && body.emergencyContact.name.trim()) {
        emergencyContact.name = body.emergencyContact.name.trim();
      }
      if (body.emergencyContact.phone && body.emergencyContact.phone.trim()) {
        emergencyContact.phone = body.emergencyContact.phone.trim();
      }
      if (body.emergencyContact.relationship && body.emergencyContact.relationship.trim()) {
        emergencyContact.relationship = body.emergencyContact.relationship.trim();
      }
      
      // Only add emergencyContact if it has at least one field
      if (Object.keys(emergencyContact).length > 0) {
        cleanedData.emergencyContact = emergencyContact;
      }
    }
    
    // Generate patient ID if not provided
    if (!cleanedData.patientId) {
      try {
        const lastPatient = await Patient.findOne({}, { patientId: 1 }).sort({ patientId: -1 });
        let nextId = 1;
        if (lastPatient && lastPatient.patientId) {
          const match = lastPatient.patientId.match(/PAT-(\d+)/);
          if (match) {
            nextId = parseInt(match[1]) + 1;
          }
        }
        cleanedData.patientId = `PAT-${nextId.toString().padStart(4, '0')}`;
      } catch (idError) {
        console.error('Error generating patient ID:', idError);
        cleanedData.patientId = `PAT-${Date.now().toString().slice(-6)}`;
      }
    }
    
    console.log('Cleaned patient data:', JSON.stringify(cleanedData, null, 2));
    
    const patient = new Patient(cleanedData);
    
    // Validate the patient before saving
    const validationError = patient.validateSync();
    if (validationError) {
      console.error('Validation error details:', validationError);
      const errorMessages: string[] = [];
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(key => {
          errorMessages.push(`${key}: ${validationError.errors[key].message}`);
        });
      }
      return NextResponse.json({ 
        error: 'Patient validation failed', 
        details: errorMessages.length > 0 ? errorMessages.join(', ') : validationError.message 
      }, { status: 400 });
    }
    
    await patient.save();
    
    // If password was provided, create a User account for patient login
    if (body.password && body.password.trim()) {
      try {
        // Check if user already exists with this email
        const existingUser = await User.findOne({ email: body.email.toLowerCase() });
        if (existingUser) {
          // Update existing user to patient role if needed
          if (existingUser.role !== 'patient') {
            existingUser.role = 'patient';
            if (body.password && body.password.trim()) {
              existingUser.password = await bcrypt.hash(body.password, 12);
            }
            await existingUser.save();
          }
        } else {
          // Create new user account for patient
          const hashedPassword = await bcrypt.hash(body.password, 12);
          const user = new User({
            email: body.email.toLowerCase(),
            name: body.name,
            password: hashedPassword,
            role: 'patient'
          });
          await user.save();
        }
      } catch (userError: any) {
        console.error('Error creating user account for patient:', userError);
        // If user creation fails due to duplicate email, return error
        if (userError.code === 11000) {
          return NextResponse.json({ 
            error: 'User account creation failed',
            details: 'A user account with this email already exists'
          }, { status: 400 });
        }
        // For other errors, log but don't fail patient creation
        console.warn('User account creation failed, but patient was created:', userError.message);
      }
    }
    
    return NextResponse.json(patient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating patient:', error);
    
    // Handle duplicate key error (e.g., duplicate email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json({ 
        error: 'Duplicate entry',
        details: `${field} already exists`
      }, { status: 400 });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages: string[] = [];
      if (error.errors) {
        Object.keys(error.errors).forEach(key => {
          errorMessages.push(`${key}: ${error.errors[key].message}`);
        });
      }
      return NextResponse.json({ 
        error: 'Patient validation failed', 
        details: errorMessages.length > 0 ? errorMessages.join(', ') : error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create patient',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
