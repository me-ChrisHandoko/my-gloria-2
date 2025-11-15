// Test script to check bagian-kerja-jenjang API endpoint
// Run: node test-bagian-kerja-api.js

const API_BASE_URL = 'http://localhost:3001/v1';
const TOKEN = 'your-token-here'; // Replace with actual token from localStorage

async function testBagianKerjaAPI() {
  console.log('🧪 Testing bagian-kerja-jenjang API...\n');

  try {
    const url = `${API_BASE_URL}/organizations/schools/bagian-kerja-jenjang`;
    console.log(`📡 Calling: ${url}\n`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();

    console.log('\n📦 Raw Response:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n🔍 Analysis:');
    console.log(`- Response Type: ${typeof data}`);
    console.log(`- Is Object: ${typeof data === 'object'}`);
    console.log(`- Has 'success': ${data && 'success' in data}`);
    console.log(`- Has 'data': ${data && 'data' in data}`);
    console.log(`- Is Wrapped: ${data && data.success && data.data}`);

    if (data && data.success && data.data) {
      console.log(`\n✅ Backend Response Format (Wrapped):`);
      console.log(`- data.success: ${data.success}`);
      console.log(`- data.data type: ${typeof data.data}`);
      console.log(`- data.data is Array: ${Array.isArray(data.data)}`);
      console.log(`- data.data length: ${data.data?.length || 0}`);
      console.log(`- data.data content:`, data.data);
    } else if (Array.isArray(data)) {
      console.log(`\n✅ Backend Response Format (Direct Array):`);
      console.log(`- Array length: ${data.length}`);
      console.log(`- Array content:`, data);
    } else {
      console.log(`\n⚠️  Unexpected Response Format!`);
      console.log(`- Type: ${typeof data}`);
      console.log(`- Content:`, data);
    }

    console.log('\n📝 Frontend Transform Logic Test:');
    let transformedData;

    // Simulate frontend transformResponse logic
    if (data && data.success && data.data) {
      transformedData = data.data;
      console.log('✅ Using wrapped response: data.data');
    } else if (Array.isArray(data)) {
      transformedData = data;
      console.log('✅ Using direct array: data');
    } else {
      transformedData = [];
      console.log('⚠️  Fallback to empty array');
    }

    console.log(`\n🎯 Final Transformed Data:`);
    console.log(`- Type: ${typeof transformedData}`);
    console.log(`- Is Array: ${Array.isArray(transformedData)}`);
    console.log(`- Length: ${transformedData.length}`);
    console.log(`- Content:`, transformedData);

    console.log(`\n🎨 Combobox Options (as rendered):`);
    const comboboxOptions = transformedData.map((bagian) => ({
      value: bagian,
      label: bagian,
      searchLabel: bagian,
    }));
    console.log(JSON.stringify(comboboxOptions, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Get token from command line or prompt
const args = process.argv.slice(2);
if (args.length > 0) {
  const TOKEN = args[0];
  testBagianKerjaAPI();
} else {
  console.log('⚠️  No token provided!');
  console.log('\nUsage: node test-bagian-kerja-api.js <your-jwt-token>');
  console.log('\nTo get your token:');
  console.log('1. Open http://localhost:3000 in browser');
  console.log('2. Login to the app');
  console.log('3. Open DevTools Console');
  console.log('4. Run: localStorage.getItem("token")');
  console.log('5. Copy the token and run:');
  console.log('   node test-bagian-kerja-api.js YOUR_TOKEN_HERE\n');
}
