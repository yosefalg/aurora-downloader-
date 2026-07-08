import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  const res = http.post('http://localhost:3000/api/analyze', JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}
