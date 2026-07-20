#!/bin/bash
set -euo pipefail

echo "Waiting 5 minutes for potential scale-to-zero..."
sleep 300

TOKEN=$(curl -s --max-time 30 -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"Admin@1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

echo "Measuring cold-start response time..."
{ time curl -s --max-time 60 http://localhost:3000/api/students -H "Authorization: Bearer $TOKEN" > /dev/null; } 2>&1
