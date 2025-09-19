/**
 * Performance and Load Testing using K6
 * Install k6: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation/
 * Run: k6 run test/performance/load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const userListDuration = new Trend('user_list_duration');
const permissionCheckDuration = new Trend('permission_check_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 }, // Ramp up to 50 users over 1m
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2m
    { duration: '3m', target: 100 }, // Stay at 100 users for 3m
    { duration: '1m', target: 50 }, // Ramp down to 50 users over 1m
    { duration: '30s', target: 0 }, // Ramp down to 0 users over 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    errors: ['rate<0.1'], // Error rate < 10%
    login_duration: ['p(95)<300'], // 95% of logins < 300ms
    user_list_duration: ['p(95)<200'], // 95% of user list < 200ms
    permission_check_duration: ['p(95)<100'], // 95% of permission checks < 100ms
  },
};

// Test environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-jwt-token';

// Helper function to make authenticated requests
function authenticatedRequest(url, params = {}) {
  const authParams = {
    ...params,
    headers: {
      ...params.headers,
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };
  return http.request(
    params.method || 'GET',
    url,
    params.body || null,
    authParams,
  );
}

// Setup function - runs once per VU
export function setup() {
  // Test connectivity
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'Health check successful': (r) => r.status === 200,
  });

  if (healthCheck.status !== 200) {
    throw new Error('API is not healthy');
  }

  return { startTime: Date.now() };
}

// Main test scenario
export default function (data) {
  // Scenario 1: Authentication Flow
  group('Authentication Flow', () => {
    const loginStart = Date.now();
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: `user${__VU}@test.com`,
        password: 'password123',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    loginDuration.add(Date.now() - loginStart);

    const loginSuccess = check(loginRes, {
      'Login successful': (r) => r.status === 200 || r.status === 201,
      'Login returns token': (r) => {
        const body = r.json();
        return body && body.token;
      },
    });

    errorRate.add(!loginSuccess);

    if (loginSuccess && loginRes.json().token) {
      AUTH_TOKEN = loginRes.json().token;
    }

    sleep(1);
  });

  // Scenario 2: User Management
  group('User Management', () => {
    // List users
    const listStart = Date.now();
    const listRes = authenticatedRequest(`${BASE_URL}/users?page=1&limit=20`);
    userListDuration.add(Date.now() - listStart);

    const listSuccess = check(listRes, {
      'User list successful': (r) => r.status === 200,
      'User list has data': (r) => {
        const body = r.json();
        return body && body.data && Array.isArray(body.data);
      },
    });

    errorRate.add(!listSuccess);

    // Get user details
    if (listSuccess && listRes.json().data.length > 0) {
      const userId = listRes.json().data[0].id;
      const userRes = authenticatedRequest(`${BASE_URL}/users/${userId}`);

      check(userRes, {
        'User details successful': (r) => r.status === 200,
        'User has expected fields': (r) => {
          const user = r.json();
          return user && user.id && user.email;
        },
      });
    }

    sleep(0.5);
  });

  // Scenario 3: Permission Checks
  group('Permission System', () => {
    const permStart = Date.now();
    const permRes = authenticatedRequest(`${BASE_URL}/permissions/check`, {
      method: 'POST',
      body: JSON.stringify({
        permission: 'MANAGE_USERS',
        scope: 'DEPARTMENT',
      }),
    });
    permissionCheckDuration.add(Date.now() - permStart);

    const permSuccess = check(permRes, {
      'Permission check successful': (r) => r.status === 200,
      'Permission returns boolean': (r) => {
        const body = r.json();
        return body && typeof body.hasPermission === 'boolean';
      },
    });

    errorRate.add(!permSuccess);

    sleep(0.5);
  });

  // Scenario 4: Organization Operations
  group('Organization Management', () => {
    // List schools
    const schoolsRes = authenticatedRequest(
      `${BASE_URL}/organizations/schools`,
    );

    check(schoolsRes, {
      'Schools list successful': (r) => r.status === 200,
    });

    // List departments
    const deptsRes = authenticatedRequest(
      `${BASE_URL}/organizations/departments`,
    );

    check(deptsRes, {
      'Departments list successful': (r) => r.status === 200,
    });

    sleep(1);
  });

  // Scenario 5: Concurrent Operations
  group('Concurrent Operations', () => {
    const batch = http.batch([
      [
        'GET',
        `${BASE_URL}/users`,
        null,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } },
      ],
      [
        'GET',
        `${BASE_URL}/roles`,
        null,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } },
      ],
      [
        'GET',
        `${BASE_URL}/permissions`,
        null,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } },
      ],
    ]);

    check(batch[0], { 'Batch users successful': (r) => r.status === 200 });
    check(batch[1], { 'Batch roles successful': (r) => r.status === 200 });
    check(batch[2], {
      'Batch permissions successful': (r) => r.status === 200,
    });

    sleep(2);
  });

  // Scenario 6: Cache Performance
  group('Cache Performance', () => {
    const userId = `user-${__VU}`;

    // First request - cache miss
    const firstRes = authenticatedRequest(`${BASE_URL}/users/${userId}`);
    const firstDuration = firstRes.timings.duration;

    // Second request - should be cached
    const secondRes = authenticatedRequest(`${BASE_URL}/users/${userId}`);
    const secondDuration = secondRes.timings.duration;

    check(null, {
      'Cache improves performance': () => secondDuration < firstDuration * 0.5,
    });

    sleep(1);
  });

  // Random sleep between iterations
  sleep(Math.random() * 3 + 1);
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  console.log(`Test completed. Duration: ${Date.now() - data.startTime}ms`);
}
