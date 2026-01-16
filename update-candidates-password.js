/**
 * Update Candidates Password
 * 
 * This script allows updating candidate passwords in MongoDB
 * Passwords are hashed with SHA256 before storing
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');
require('dotenv').config();

// MongoDB configuration
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'ethervox_candidates';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'candidates';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 */
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

/**
 * Hash password using SHA256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * List all candidates
 */
async function listCandidates(collection) {
  console.log('\n' + '='.repeat(60));
  console.log('Available Candidates:');
  console.log('='.repeat(60));

  const candidates = await collection.find({}).toArray();
  
  if (candidates.length === 0) {
    console.log('⚠️  No candidates found in database.');
    return [];
  }

  candidates.forEach((candidate, index) => {
    console.log(`\n[${index + 1}] Candidate ID: ${candidate.candidateId}`);
    console.log(`    Name: ${candidate.name}`);
    console.log(`    Email: ${candidate.email}`);
    console.log(`    Party: ${candidate.party}`);
    console.log(`    Active: ${candidate.isActive ? '✅ Yes' : '❌ No'}`);
  });

  console.log('\n' + '='.repeat(60));
  return candidates;
}

/**
 * Update candidate password
 */
async function updateCandidatePassword() {
  let client;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('Update Candidate Password');
    console.log('='.repeat(60) + '\n');

    // Connect to MongoDB
    console.log('[1/5] Connecting to MongoDB...');
    client = await MongoClient.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    const db = client.db(MONGODB_DB);
    const candidatesCollection = db.collection(MONGODB_COLLECTION);
    console.log('✅ Connected to MongoDB\n');

    // List all candidates
    console.log('[2/5] Fetching candidates...');
    const candidates = await listCandidates(candidatesCollection);
    
    if (candidates.length === 0) {
      console.log('\nNo candidates to update. Exiting...');
      return;
    }

    // Get candidate ID from user
    console.log('\n[3/5] Select candidate to update:');
    const candidateId = await question('Enter Candidate ID: ');

    // Find the candidate
    const candidate = await candidatesCollection.findOne({ candidateId: candidateId.trim() });
    
    if (!candidate) {
      console.log(`\n❌ Candidate with ID '${candidateId}' not found.`);
      return;
    }

    console.log(`\n✅ Found candidate: ${candidate.name}`);

    // Get new password
    console.log('\n[4/5] Enter new password:');
    const newPassword = await question('New Password (min 6 characters): ');

    if (newPassword.length < 6) {
      console.log('\n❌ Password must be at least 6 characters long.');
      return;
    }

    const confirmPassword = await question('Confirm Password: ');

    if (newPassword !== confirmPassword) {
      console.log('\n❌ Passwords do not match.');
      return;
    }

    // Update password
    console.log('\n[5/5] Updating password...');
    const hashedPassword = hashPassword(newPassword);

    const result = await candidatesCollection.updateOne(
      { candidateId: candidateId.trim() },
      {
        $set: {
          candidatePassword: hashedPassword,
          passwordUpdatedAt: new Date().toISOString()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ Password Updated Successfully!');
      console.log('='.repeat(60));
      console.log(`Candidate ID: ${candidateId}`);
      console.log(`Name: ${candidate.name}`);
      console.log(`New Password: ${newPassword}`);
      console.log(`Password Hash: ${hashedPassword.substring(0, 40)}...`);
      console.log('='.repeat(60) + '\n');
    } else {
      console.log('\n⚠️  Password was not updated (might be the same as before).');
    }

  } catch (error) {
    console.error('\n❌ Error updating password:');
    console.error(error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.\n');
    }
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  updateCandidatePassword()
    .then(() => {
      console.log('✅ Update process completed.\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Update process failed:', error);
      process.exit(1);
    });
}

module.exports = updateCandidatePassword;
