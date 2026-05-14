# Hamro Cloud — Backend

Node.js + Express REST API for the Hamro Cloud frontend.  
Uses a local `db.json` file as the database (no external DB setup needed).  
Swap the `db.js` store for a real DB (PostgreSQL / MongoDB) when scaling up.

---

## Setup

```bash
cd hamro-cloud-backend
cp .env.example .env        # edit JWT_SECRET, FRONTEND_URL, BASE_URL
npm install
node server.js              # runs on http://localhost:3000
```

---

## Frontend Integration

In your frontend files, set `API_BASE` in `utils.js`:

```js
const API_BASE = "http://127.0.01:3000";
```

Then swap every mock/dummy function for real `fetch` calls as shown in the comments.  
Every protected route requires an `Authorization: Bearer <token>` header.

---

## Auth Routes

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{email, password}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Returns `{token, user}` |
| POST | `/api/auth/forgot-password` | `{email}` | Sends reset link (logged to console in dev) |
| POST | `/api/auth/reset-password` | `{token, password}` | Resets password via token |

---

## User Routes (require Bearer token)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/user/me` | — | Current user info + avatarUrl |
| GET | `/api/user/storage` | — | `{used, total}` in GB |
| GET | `/api/user/stats` | — | `{totalFiles, sharedWithMe, groups, activeLinks}` |
| PATCH | `/api/user/profile` | `{fullName, email}` | Update name/email |
| POST | `/api/user/change-password` | `{currentPassword, newPassword}` | Change password |
| DELETE | `/api/user/account` | — | Delete account + all files |

---

## File Routes (require Bearer token)

| Method | Path | Query / Body | Description |
|--------|------|------|-------------|
| GET | `/api/files` | `?q=search&filter=pdf\|image\|doc\|other` | List own files |
| GET | `/api/files/recent` | `?limit=4` | Recent files for dashboard |
| POST | `/api/files/upload` | `multipart: file` | Upload a file |
| GET | `/api/files/:id/download` | — | Download (owner or shared with) |
| DELETE | `/api/files/:id` | — | Delete file |
| POST | `/api/files/:id/share` | `{email}` | Share file with a user |

---

## Group Routes (require Bearer token)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/groups` | — | Groups I belong to |
| POST | `/api/groups` | `{name, description?, inviteEmail?}` | Create group |
| GET | `/api/groups/:id` | — | Group info |
| GET | `/api/groups/:id/members` | — | Member list |
| POST | `/api/groups/:id/invite` | `{email}` | Invite member (admin only) |
| DELETE | `/api/groups/:id/members/:userId` | — | Remove member (admin only) |
| DELETE | `/api/groups/:id/members/me` | — | Leave group |
| GET | `/api/groups/:id/files` | — | Group files |
| POST | `/api/groups/:id/files` | `multipart: file` | Upload to group |
| DELETE | `/api/groups/:id/files/:fileId` | — | Delete group file |
| GET | `/api/groups/invites/me` | — | My pending invites |
| POST | `/api/groups/invites/:inviteId/accept` | — | Accept invite |
| POST | `/api/groups/invites/:inviteId/decline` | — | Decline invite |

---

## Shared Routes (require Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shared/with-me` | Files shared with me |
| GET | `/api/shared/by-me` | Files I shared |
| DELETE | `/api/shared/:shareId` | Revoke a share |

---

## Link Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/links` | Required | My share links |
| POST | `/api/links` | Required | `{fileName\|fileId, expiry?, password?}` → Create link |
| DELETE | `/api/links/:id` | Required | Revoke link |
| GET | `/api/links/:token/access` | None | Public download (add `?password=xxx` if protected) |

---

## Frontend Swap Guide

For each JS file, here's what to change:

### `utils.js`
```js
const API_BASE = "http://127.0.0.1:3000";   // ← set this
```

### `login.js`
```js
async function loginUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).message);
    return await res.json();   // { token, user }
}
// Then: localStorage.setItem("hc_token", data.token)
```

### `register.js`
```js
async function registerUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).message);
    return await res.json();
}
```

### All authenticated pages
Add this helper to `utils.js`:
```js
function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("hc_token")
    };
}
```

### File upload (`files.js`)
```js
async function apiUploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + localStorage.getItem("hc_token") },
        body: fd
    });
    if (!res.ok) throw new Error((await res.json()).message);
    return await res.json();
}
```
