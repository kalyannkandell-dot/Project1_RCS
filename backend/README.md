Here's your backend README.md:

```md
# Hamro Cloud — Backend

A RESTful backend for Hamro Cloud, a remote cloud storage platform. Built with Node.js and Express, using SQLite for data persistence.

## Stack

- **Node.js** — runtime
- **Express** — web framework
- **SQLite** — database (via better-sqlite3)
- **bcrypt** — password hashing
- **jsonwebtoken** — JWT authentication
- **multer** — file upload handling
- **nodemailer** — email sending (password reset)
- **cors** — cross-origin requests
- **morgan** — request logging
- **dotenv** — environment variables

## Setup

### Install dependencies

```bash
npm install
```

### Configure environment

Create a `.env` file in the root:

```
PORT=3000
JWT_SECRET=your_secret_key_here
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://127.0.0.1:5500/frontend
```

> Gmail App Password: Google Account → Security → 2-Step Verification → App Passwords

### Run

```bash
node server.js
```

Server starts on `http://localhost:3000`

## Folder Structure

```
backend/
├── routes/
│   ├── auth.js        — login, register, forgot/reset password
│   ├── files.js       — upload, download, delete, share
│   ├── groups.js      — create, invite, members, leave
│   ├── shared.js      — shared with me, shared by me, revoke
│   └── user.js        — profile, avatar, storage, delete account
├── middleware/
│   └── auth.js        — JWT verification
├── db/
│   └── database.js    — SQLite connection and table setup
├── uploads/           — uploaded files stored here
├── .env               — secrets
├── .gitignore
├── package.json
└── server.js          — entry point
```

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login and receive JWT |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset password with token |
| POST | `/change-password` | Change password (protected) |

### User — `/api/user`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get profile |
| POST | `/update` | Update profile |
| POST | `/avatar` | Upload avatar |
| GET | `/storage` | Get storage usage |
| GET | `/stats` | Get user stats |
| DELETE | `/me` | Delete account |

### Files — `/api/files`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Upload file |
| GET | `/recent` | Get recent files |
| GET | `/:id/download` | Download file |
| DELETE | `/:id` | Delete file |
| POST | `/:id/share/person` | Share with a user |

### Groups — `/api/groups`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user groups |
| POST | `/` | Create group |
| GET | `/:groupId` | Get group details |
| GET | `/:groupId/members` | List members |
| POST | `/:groupId/invite` | Invite member |
| DELETE | `/:groupId/members/:memberId` | Remove member |
| DELETE | `/:groupId/members/me` | Leave group |
| GET | `/:groupId/files` | List group files |
| POST | `/:groupId/files` | Upload to group |
| DELETE | `/:groupId/files/:fileId` | Delete group file |
| POST | `/:groupId/files/:fileId` | Share file to group |
| GET | `/invites` | List pending invites |
| POST | `/invites/:inviteId/accept` | Accept invite |
| DELETE | `/invites/:inviteId` | Decline invite |

### Shared — `/api/shared`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/with-me` | Files shared with you |
| GET | `/by-me` | Files you shared |
| DELETE | `/:shareId` | Revoke a share |

## Notes

- JWT tokens expire after 7 days
- Password reset links expire after 1 hour
- Storage limit is 1GB per user
- File uploads stored in `uploads/` folder
- Passwords are hashed with bcrypt (10 rounds)
```
