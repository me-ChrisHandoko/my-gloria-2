/**
 * Test utility to verify API configuration
 * Run this in browser console: await testApiConnection()
 */

import { apiEndpoints, checkApiHealth } from '@/config/api';

export async function testApiConnection() {
  console.log('🔍 Testing API Configuration...\n');

  // Display current configuration
  console.log('📋 Current Configuration:');
  console.log('  Base API URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('  API Version:', process.env.NEXT_PUBLIC_API_VERSION || 'v1');
  console.log('  Full Auth Login URL:', apiEndpoints.auth.login);
  console.log('  Full Auth Health URL:', apiEndpoints.auth.health);

  console.log('\n🏥 Testing Health Endpoint...');

  try {
    const isHealthy = await checkApiHealth();

    if (isHealthy) {
      console.log('✅ API Health Check: SUCCESS');
      console.log('   Backend is running and accessible');
    } else {
      console.log('❌ API Health Check: FAILED');
      console.log('   Backend returned non-OK status');
    }
  } catch (error) {
    console.log('❌ API Health Check: ERROR');
    console.log('   Could not connect to backend');
    console.error('   Error:', error);
  }

  console.log('\n💡 Troubleshooting Tips:');
  console.log('1. Ensure backend is running on port 3001');
  console.log('2. Check NEXT_PUBLIC_API_URL in .env.local');
  console.log('3. Verify no duplicate "/api" in the URL path');
  console.log('4. Check browser network tab for actual request URLs');

  return apiEndpoints;
}

// Make it available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testApiConnection = testApiConnection;
}