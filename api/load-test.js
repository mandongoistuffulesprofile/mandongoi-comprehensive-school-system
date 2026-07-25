import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/health`, null, { tags: { name: 'health' } }],
    ['GET', `${BASE_URL}/api/dashboard/kpis`, null, { headers, tags: { name: 'dashboard' } }],
    ['GET', `${BASE_URL}/api/fees/invoices?page=1&limit=20`, null, { headers, tags: { name: 'invoices' } }],
    ['GET', `${BASE_URL}/api/students?limit=20`, null, { headers, tags: { name: 'students' } }],
    ['GET', `${BASE_URL}/api/staff`, null, { headers, tags: { name: 'staff' } }],
  ]);

  check(responses[0], { 'health ok': (r) => r.status === 200 });
  check(responses[1], { 'dashboard ok': (r) => r.status === 200 });
  check(responses[2], { 'invoices ok': (r) => r.status === 200 });

  sleep(1);
}
