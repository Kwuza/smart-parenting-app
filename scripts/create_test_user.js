#!/usr/bin/env node
/**
 * Smart Parenting App — Test Account Creator
 * 
 * Creates a test auth user for the seed script.
 * 
 * Usage:
 *   SUPABASE_URL=https://your-project.supabase.co \
 *   TEST_PASSWORD=<dev-password> \
 *   node scripts/create_test_user.js <service_role_key>
 *
 * Optional:
 *   TEST_EMAIL=test@smartparenting.dev
 *
 * Get your service role key from:
 *   Supabase Dashboard → Settings → API → service_role (secret)
 *
 * After running this, copy the printed UUID into seed_test_account.sql.template
 * if you want to run the optional development seed data.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@smartparenting.dev';
const TEST_PASSWORD = process.env.TEST_PASSWORD;

async function main() {
  const serviceKey = process.argv[2];
  
  if (!serviceKey || !SUPABASE_URL || !TEST_PASSWORD) {
    console.error('Usage: SUPABASE_URL=https://your-project.supabase.co TEST_PASSWORD=<dev-password> node scripts/create_test_user.js <service_role_key>');
    console.error('');
    console.error('Get your service_role key from:');
    console.error('  Supabase Dashboard → Settings → API → service_role (secret)');
    console.error('');
    console.error('Optional: set TEST_EMAIL to override test@smartparenting.dev');
    process.exit(1);
  }

  console.log('Creating test user...');
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log('  Password: set via TEST_PASSWORD env');
  console.log('');

  // Create user via Supabase Admin API
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Test Parent',
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.msg?.includes('already been registered') || data.msg?.includes('already registered')) {
      // User already exists — fetch their ID
      console.log('User already exists. Fetching UUID...');
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(TEST_EMAIL)}`, {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      });
      const listData = await listRes.json();
      const user = listData.users?.find(u => u.email === TEST_EMAIL);
      if (user) {
        console.log('');
        console.log('═════════════════════════════════════════');
        console.log('  EXISTING USER FOUND');
        console.log(`  UUID: ${user.id}`);
        console.log('═════════════════════════════════════════');
        console.log('');
        console.log('Copy this UUID into seed_test_account.sql.template if you want optional seed data:');
        console.log(`  test_parent_id UUID := '${user.id}';`);
        console.log('');
        console.log('Then copy the template contents into Supabase SQL Editor.');
      }
      return;
    }
    console.error('Failed to create user:', data);
    process.exit(1);
  }

  const userId = data.id;
  
  console.log('');
  console.log('═════════════════════════════════════════');
  console.log('  TEST USER CREATED');
  console.log(`  UUID: ${userId}`);
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log('  Password: set via TEST_PASSWORD env');
  console.log('═════════════════════════════════════════');
  console.log('');
  console.log('Next steps:');
  console.log(`1. Open seed_test_account.sql.template`);
  console.log(`2. Replace 'YOUR_USER_UUID' with: ${userId}`);
  console.log(`3. Copy the template contents into Supabase SQL Editor if you want optional seed data`);
  console.log('');
  console.log('Login credentials:');
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log('  Password: set via TEST_PASSWORD env');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
