// E2E test: Edge Function with valid JWT + image
// Uses Supabase service role to generate a user JWT, then calls the edge function

const SUPABASE_URL = 'https://xqyoculmqbjhcgyzukgx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeW9jdWxtcWJqaGNneXp1a2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk2NDkwNSwiZXhwIjoyMDg2NTQwOTA1fQ.3PqgCnkS9LD-DnrC_Ga82qk0GCEn2BNQ7Ui71q2xxvY';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeW9jdWxtcWJqaGNneXp1a2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjQ5MDUsImV4cCI6MjA4NjU0MDkwNX0.bXjH-wGDCX6L9x4cCLnJYnk38Ccv-7REr5rs2PD_PoE';
const TEST_EMAIL = 'hongs7051@gmail.com';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-screenshot`;

// Minimal 1x1 white PNG (valid image)
const MINIMAL_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function getAccessToken() {
  // Use admin API to get user, then sign in via REST
  // Actually, let's use the GoTrue admin endpoint to generate a link/token
  // The easiest way: use the Supabase Auth Admin API to create a session

  // Step 1: Get user by email using admin API
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    }
  });
  
  if (!listRes.ok) {
    throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`);
  }
  
  const usersData = await listRes.json();
  const user = usersData.users?.find(u => u.email === TEST_EMAIL);
  
  if (!user) {
    throw new Error(`User ${TEST_EMAIL} not found`);
  }
  
  console.log(`Found user: ${user.id} (${user.email})`);
  
  // Step 2: Generate a magic link / OTP, then exchange it
  // Actually, the simplest approach with service_role: use the admin generateLink API
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: TEST_EMAIL,
    })
  });
  
  if (!linkRes.ok) {
    throw new Error(`Failed to generate link: ${linkRes.status} ${await linkRes.text()}`);
  }
  
  const linkData = await linkRes.json();
  
  // The response contains hashed_token; we need to verify it via the token endpoint
  // Extract the token from the action_link
  const actionLink = linkData.properties?.action_link || linkData.action_link;
  if (!actionLink) {
    console.log('Link data:', JSON.stringify(linkData, null, 2));
    throw new Error('No action_link in response');
  }
  
  console.log(`Got action link, extracting token...`);
  
  // Parse the action link to get the token
  const url = new URL(actionLink);
  const token = url.searchParams.get('token');
  const type = url.searchParams.get('type');
  
  if (!token) {
    throw new Error(`No token in action link: ${actionLink}`);
  }
  
  // Step 3: Verify the OTP to get an access token
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token: token,
      redirect_to: 'http://localhost:3000',
    })
  });
  
  if (!verifyRes.ok) {
    const errText = await verifyRes.text();
    throw new Error(`Failed to verify token: ${verifyRes.status} ${errText}`);
  }
  
  const session = await verifyRes.json();
  const accessToken = session.access_token;
  
  if (!accessToken) {
    console.log('Verify response:', JSON.stringify(session, null, 2));
    throw new Error('No access_token in verify response');
  }
  
  console.log(`Got access token: ${accessToken.substring(0, 30)}...`);
  return accessToken;
}

async function testEdgeFunction(accessToken) {
  console.log('\n--- Test 1: Minimal PNG (should return empty or error gracefully) ---');
  
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      image: MINIMAL_PNG_B64,
      mimeType: 'image/png',
    })
  });
  
  console.log(`Status: ${res.status}`);
  const body = await res.json();
  console.log(`Response:`, JSON.stringify(body, null, 2));
  
  if (res.status === 200) {
    console.log(`\nSUCCESS: Edge function returned 200`);
    console.log(`Records found: ${body.records?.length ?? 0}`);
    return true;
  } else {
    console.log(`\nFAILED: Unexpected status ${res.status}`);
    return false;
  }
}

async function main() {
  try {
    console.log('=== Edge Function E2E Test ===\n');
    
    // Get a valid JWT
    const accessToken = await getAccessToken();
    
    // Test with minimal image
    const success = await testEdgeFunction(accessToken);
    
    console.log(`\n=== Final Result: ${success ? 'PASS' : 'FAIL'} ===`);
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

main();
