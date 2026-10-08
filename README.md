# Week 01 — JWT Authentication Prototype

**Project:** HealWithIndia  
**Owner:** Yash Vardhan  
**Sprint:** Secure Login with JWT  
**Sprint period:** 10/08/2026 – 24/08/2026

This standalone Python prototype demonstrates the basic JWT authentication
flow assigned to the first backend sprint.

It is intentionally isolated and does not connect to or modify:
- Next.js application code
- Supabase
- project database
- production API
- authentication configuration

## Run

```bash
python jwt_auth_demo.py
```

## Demonstrates

- local demo-user authentication
- JWT creation using HS256-style HMAC signing
- payload claims
- signature verification
- expiry validation
- invalid-password rejection
- tampered-token rejection

This is educational/supporting work, not a replacement for production
authentication. Production code should use a maintained security library
and secure secret/password storage.
