# Emergent Auth Testing Playbook

## Step 1: Create Test User & Session (MongoDB)
Use `mongosh` to insert a user + a matching `user_sessions` doc.

```bash
mongosh --eval "
use('test_database');
var userId = 'user_' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test Athlete',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
curl -X GET "$BASE/api/auth/me" -H "Cookie: session_token=<TOKEN>"
curl -X POST "$BASE/api/workouts" -H "Content-Type: application/json" \
  -H "Cookie: session_token=<TOKEN>" \
  -d '{"type":"Running","duration_min":30,"calories":250}'
```

## Step 3: Browser Testing (Playwright)
```python
await page.context.add_cookies([{
  "name": "session_token", "value": "<TOKEN>",
  "domain": "sweatboard.preview.emergentagent.com",
  "path": "/", "httpOnly": True, "secure": True, "sameSite": "None"
}])
await page.goto(f"{BASE}/board")
```

## Checklist
- [ ] `user_id` custom UUID (not Mongo `_id`)
- [ ] All queries use `{"_id": 0}` projection
- [ ] Callback detection uses `useLocation().hash`
- [ ] `/api/auth/me` returns user data
- [ ] `/board` loads without redirect after session cookie is present
- [ ] Logout deletes session doc + clears cookie

## Emergent OAuth Notes
- Redirect URL is dynamic: `window.location.origin + '/board'`.
- Do NOT hardcode or fall back to any other URL.
- Auth start: `https://auth.emergentagent.com/?redirect=<encoded>`.
- Exchange endpoint (backend only): `GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` with `X-Session-ID` header.
