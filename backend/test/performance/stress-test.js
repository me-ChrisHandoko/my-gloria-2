/**
 * Stress Testing for Gloria Backend
 * Tests system behavior under extreme load conditions
 * Run: k6 run test/performance/stress-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const requestCount = new Counter('requests');
const concurrentUsers = new Trend('concurrent_users');
const memoryUsage = new Trend('memory_usage');
const cpuUsage = new Trend('cpu_usage');

// Stress test configuration - gradually increase load to find breaking point
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Warm up
    { duration: '1m', target: 100 },    // Normal load
    { duration: '1m', target: 200 },    // High load
    { duration: '2m', target: 500 },    // Very high load
    { duration: '2m', target: 1000 },   // Extreme load
    { duration: '1m', target: 1500 },   // Breaking point test
    { duration: '2m', target: 1500 },   // Sustained extreme load
    { duration: '2m', target: 0 },      // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s even under stress
    errors: ['rate<0.5'],               // Error rate should stay below 50% even under extreme load
    http_req_failed: ['rate<0.5'],      // HTTP failure rate < 50%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Helper to track system metrics
function getSystemMetrics() {
  const metricsRes = http.get(`${BASE_URL}/health/metrics`);
  if (metricsRes.status === 200) {
    const metrics = metricsRes.json();
    if (metrics.memory) {
      memoryUsage.add(metrics.memory.heapUsed / 1024 / 1024); // Convert to MB
    }
    if (metrics.cpu) {
      cpuUsage.add(metrics.cpu.percentage);
    }
  }
}

export function setup() {
  console.log('Starting stress test...');
  console.log(`Target: ${BASE_URL}`);

  // Verify system is healthy before starting
  const health = http.get(`${BASE_URL}/health`);
  if (health.status !== 200) {
    throw new Error('System not healthy before stress test');
  }

  return {
    startTime: Date.now(),
    initialMetrics: health.json(),
  };
}

export default function (data) {
  concurrentUsers.add(__VU);
  requestCount.add(1);

  // Scenario 1: Database Stress Test
  group('Database Stress', () => {
    // Complex query with joins
    const complexQueryRes = http.get(
      `${BASE_URL}/api/v1/users?` +
      `page=${Math.floor(Math.random() * 100) + 1}&` +
      `limit=50&` +
      `includeRoles=true&` +
      `includePositions=true&` +
      `includePermissions=true`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

    const success = check(complexQueryRes, {
      'Complex query succeeds': (r) => r.status === 200 || r.status === 401,
      'Response time acceptable': (r) => r.timings.duration < 3000,
    });

    successRate.add(success);
    errorRate.add(!success);

    // Bulk write operations
    if (__VU % 10 === 0) { // Every 10th VU performs writes
      const bulkWriteRes = http.post(
        `${BASE_URL}/api/v1/audit/logs`,
        JSON.stringify({
          action: 'STRESS_TEST',
          entityType: 'TEST',
          entityId: `test-${Date.now()}`,
          metadata: {
            vu: __VU,
            iteration: __ITER,
            timestamp: Date.now(),
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
        }
      );

      check(bulkWriteRes, {
        'Write operation succeeds': (r) => r.status < 500,
      });
    }
  });

  // Scenario 2: Cache Stress Test
  group('Cache Stress', () => {
    const cacheKey = `cache-test-${__VU % 100}`; // Limited key space to test cache eviction

    // Rapid cache read/write
    for (let i = 0; i < 5; i++) {
      const cacheRes = http.get(
        `${BASE_URL}/api/v1/permissions/check?key=${cacheKey}`,
        {
          headers: { 'x-api-key': API_KEY },
        }
      );

      check(cacheRes, {
        'Cache operation succeeds': (r) => r.status < 500,
      });
    }
  });

  // Scenario 3: Connection Pool Stress
  group('Connection Pool Stress', () => {
    // Create many concurrent connections
    const batch = [];
    for (let i = 0; i < 10; i++) {
      batch.push([
        'GET',
        `${BASE_URL}/api/v1/users/${Math.floor(Math.random() * 1000)}`,
        null,
        { headers: { 'x-api-key': API_KEY } },
      ]);
    }

    const batchRes = http.batch(batch);
    const allSuccess = batchRes.every(r => r.status < 500);

    check(null, {
      'All concurrent requests handled': () => allSuccess,
    });
  });

  // Scenario 4: Memory Leak Test
  if (__VU % 50 === 0) { // Every 50th VU checks memory
    group('Memory Monitoring', () => {
      getSystemMetrics();

      // Large payload to test memory handling
      const largePayload = {
        data: new Array(1000).fill({
          id: `id-${Date.now()}`,
          name: 'Test User',
          email: 'test@example.com',
          metadata: {
            field1: 'x'.repeat(100),
            field2: 'y'.repeat(100),
            field3: 'z'.repeat(100),
          },
        }),
      };

      const largeRes = http.post(
        `${BASE_URL}/api/v1/users/bulk`,
        JSON.stringify(largePayload),
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
        }
      );

      check(largeRes, {
        'Large payload handled': (r) => r.status < 500,
      });
    });
  }

  // Scenario 5: Rate Limiting Test
  group('Rate Limiting', () => {
    // Intentionally exceed rate limits
    const rapidRequests = [];
    for (let i = 0; i < 20; i++) {
      const res = http.get(`${BASE_URL}/api/v1/auth/validate`, {
        headers: { 'x-api-key': API_KEY },
      });
      rapidRequests.push(res);
    }

    const rateLimited = rapidRequests.some(r => r.status === 429);
    check(null, {
      'Rate limiting active': () => rateLimited,
    });
  });

  // Scenario 6: Error Recovery Test
  group('Error Recovery', () => {
    // Send malformed requests
    const malformedRes = http.post(
      `${BASE_URL}/api/v1/users`,
      'not-json-{invalid',
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
      }
    );

    check(malformedRes, {
      'Malformed request handled gracefully': (r) => r.status === 400,
    });

    // Send oversized payload
    const oversizedPayload = 'x'.repeat(11 * 1024 * 1024); // 11MB (over 10MB limit)
    const oversizedRes = http.post(
      `${BASE_URL}/api/v1/users`,
      oversizedPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
      }
    );

    check(oversizedRes, {
      'Oversized payload rejected': (r) => r.status === 413 || r.status === 400,
    });
  });

  // Scenario 7: Timeout Testing
  group('Timeout Testing', () => {
    // Request that should timeout
    const slowRes = http.get(
      `${BASE_URL}/api/v1/users?delay=35000`, // 35 second delay
      {
        headers: { 'x-api-key': API_KEY },
        timeout: '40s',
      }
    );

    check(slowRes, {
      'Slow request times out appropriately': (r) =>
        r.status === 408 || r.status === 504 || r.status === 0,
    });
  });

  // Random short sleep to prevent thundering herd
  sleep(Math.random() * 0.5);
}

export function teardown(data) {
  console.log('Stress test completed');
  console.log(`Duration: ${(Date.now() - data.startTime) / 1000}s`);

  // Final health check
  const finalHealth = http.get(`${BASE_URL}/health`);
  const recovered = finalHealth.status === 200;

  console.log(`System recovered: ${recovered}`);

  if (!recovered) {
    console.error('WARNING: System did not recover after stress test');
  }

  // Get final metrics
  const metricsRes = http.get(`${BASE_URL}/health/metrics`);
  if (metricsRes.status === 200) {
    const metrics = metricsRes.json();
    console.log('Final system metrics:', JSON.stringify(metrics, null, 2));
  }

  return {
    recovered,
    duration: Date.now() - data.startTime,
  };
}