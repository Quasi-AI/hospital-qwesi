import mongoose from 'mongoose';
import AIResult from '../models/AIResult';
import Patient from '../models/Patient';
import dbConnect from '../lib/mongodb';

async function testAIResults() {
  try {
    console.log('🔌 Connecting to database...');
    await dbConnect();
    console.log('✅ Connected to database\n');

    // Get all AI results
    console.log('📊 Checking existing AI results...');
    const allResults = await AIResult.find({}).sort({ createdAt: -1 });
    console.log(`Total AI results in database: ${allResults.length}\n`);

    if (allResults.length > 0) {
      console.log('📋 Sample results:');
      allResults.slice(0, 5).forEach((result, index) => {
        console.log(`\n${index + 1}. ID: ${result._id}`);
        console.log(`   Patient ID: ${result.patientId} (type: ${typeof result.patientId})`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Title: ${result.title}`);
        console.log(`   Created: ${result.createdAt}`);
        console.log(`   Content length: ${result.content?.length || 0} chars`);
      });
    }

    // Count by type
    console.log('\n📈 Counts by type:');
    const countsByType = await AIResult.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    countsByType.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    // Get unique patient IDs
    const uniquePatientIds = await AIResult.distinct('patientId');
    console.log(`\n👥 Unique patient IDs with AI results: ${uniquePatientIds.length}`);
    if (uniquePatientIds.length > 0) {
      console.log('   Patient IDs:', uniquePatientIds.slice(0, 10));
    }

    // Get a patient to test with
    console.log('\n🔍 Finding a patient to test with...');
    const testPatient = await Patient.findOne({});
    if (!testPatient) {
      console.log('❌ No patients found in database. Please create a patient first.');
      process.exit(1);
    }

    console.log(`✅ Found test patient: ${testPatient.name} (ID: ${testPatient._id})\n`);

    // Test saving a treatment plan
    console.log('🧪 Testing save operation...');
    const testResult = new AIResult({
      patientId: String(testPatient._id),
      type: 'treatment-plan',
      title: 'Test Treatment Plan - ' + new Date().toISOString(),
      content: 'This is a test treatment plan to verify database insertion is working.',
      metadata: {
        symptoms: ['Test symptom'],
        diagnosis: 'Test diagnosis',
        medications: ['Test medication']
      }
    });

    await testResult.save();
    console.log('✅ Test treatment plan saved successfully!');
    console.log(`   Saved ID: ${testResult._id}`);
    console.log(`   Patient ID: ${testResult.patientId}`);
    console.log(`   Type: ${testResult.type}\n`);

    // Verify it was saved
    console.log('🔍 Verifying save...');
    const savedResult = await AIResult.findById(testResult._id);
    if (savedResult) {
      console.log('✅ Verification successful - result found in database!');
      console.log(`   Title: ${savedResult.title}`);
      console.log(`   Content: ${savedResult.content}\n`);
    } else {
      console.log('❌ Verification failed - result not found in database!\n');
    }

    // Test querying by patientId
    console.log(`🔍 Testing query by patientId: ${testPatient._id}...`);
    const queryResults = await AIResult.find({ 
      patientId: String(testPatient._id) 
    });
    console.log(`✅ Found ${queryResults.length} results for this patient\n`);

    // Test querying by patientId with type filter
    console.log(`🔍 Testing query by patientId and type 'treatment-plan'...`);
    const typedResults = await AIResult.find({ 
      patientId: String(testPatient._id),
      type: 'treatment-plan'
    });
    console.log(`✅ Found ${typedResults.length} treatment plans for this patient\n`);

    // Clean up test result
    console.log('🧹 Cleaning up test result...');
    await AIResult.findByIdAndDelete(testResult._id);
    console.log('✅ Test result deleted\n');

    console.log('✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAIResults();

