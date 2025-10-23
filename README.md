# LA KOMIKA Theatre System

Comprehensive theatre management system for LA KOMIKA - managing actors, ushers (uvádzači), performances, and schedules.

## 🎭 Overview

This application provides a complete solution for theatre management with role-based access control:
- **Admin**: Full system control - manage plays, performances, actors, and ushers
- **Usher**: View assigned performances and export personal schedules
- **Actor**: View performance calendar and manage availability

## ✨ Features

### 📅 Performance Calendar
- Monthly calendar view with navigation
- Add/edit/delete performances
- Usher assignment to performances
- Color-coded visualization per usher
- Slovak localization

### 🎭 Play Management
- Create and manage theatre plays/productions
- Link performances to plays
- Track play details and metadata

### 👥 Usher Management
- Usher roster with custom colors
- Assign ushers to performances
- Export individual schedules (.ics format)
- Real-time availability tracking

### 🎬 Actor Management
- Actor availability calendar
- Toggle availability by date
- Month-by-month navigation
- Conflict detection for scheduling

### 📱 Mobile Responsive
- Optimized layouts for all screen sizes
- Touch-friendly interface
- Mobile navigation component
- Responsive forms and modals

## 🔐 Authentication

### Default Credentials
- **Admin**: `matus` / (set in .env)
- **Usher**: `NatyJeBoss2025` / (set in .env)
- **Actor**: `kulisa25` / (set in .env)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Install all dependencies:
   ```bash
   npm run install:all
   ```

2. Configure environment variables:
   
   **Backend** (`backend/.env`):
   ```
   JWT_SECRET=your_secret_key_here
   PORT=3001
   ```
   
   **Frontend** (`frontend/.env.production`):
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

3. Start development servers:
   ```bash
   npm run dev
   ```

This starts:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:3000`

## 📁 Project Structure

```
theatre-system/
├── backend/                  # Node.js/Express backend
│   ├── server.js            # Main server with auth & API
│   ├── routes/
│   │   ├── plays.js         # Play management routes
│   │   └── performances.js  # Performance management routes
│   ├── .env                 # Environment configuration
│   ├── theater.db           # SQLite database
│   └── package.json
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── CalendarView.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── MobileNav.jsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── useResponsive.js
│   │   ├── App.jsx          # Main app with routing
│   │   ├── main.jsx
│   │   ├── index.css        # Global styles
│   │   └── api.js           # API client
│   ├── public/
│   │   └── lakomika-logo.svg
│   ├── .env.production
│   ├── vite.config.js
│   └── package.json
├── package.json              # Root package with scripts
└── README.md                 # This file
```

## 🗄️ Database Schema

The application uses SQLite with the following tables:

### Users
- `id`: Primary key
- `username`: Unique username
- `password`: Hashed password (bcrypt)
- `role`: 'admin' | 'usher' | 'actor'

### Plays
- `id`: Primary key
- `name`: Play name
- `description`: Optional description
- `created_at`: Timestamp

### Performances
- `id`: Primary key
- `play_id`: Foreign key to plays
- `date`: Performance date
- `time`: Performance time
- `venue`: Performance venue
- `ushers_needed`: Number of ushers required
- `created_at`: Timestamp

### Ushers
- `id`: Primary key
- `name`: Usher name
- `color`: Display color (hex)
- `created_at`: Timestamp

### Performance Assignments
- `id`: Primary key
- `performance_id`: Foreign key to performances
- `usher_id`: Foreign key to ushers
- `created_at`: Timestamp

### Actors
- `id`: Primary key
- `name`: Actor name
- `created_at`: Timestamp

### Actor Availability
- `id`: Primary key
- `actor_id`: Foreign key to actors
- `date`: Available date
- `available`: Boolean flag

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - Login with credentials

### Admin Routes
- `GET /api/admin/ushers` - Get all ushers
- `POST /api/admin/ushers` - Add new usher
- `DELETE /api/admin/ushers/:id` - Remove usher
- `GET /api/admin/performances` - Get performances
- `POST /api/admin/performances` - Create performance
- `PUT /api/admin/performances/:id` - Update performance
- `DELETE /api/admin/performances/:id` - Delete performance

### Usher Routes
- `GET /api/usher/performances` - Get assigned performances
- `GET /api/usher/calendar-export` - Export calendar (.ics)

### Play Routes
- `GET /api/plays` - Get all plays
- `POST /api/plays` - Create new play
- `PUT /api/plays/:id` - Update play
- `DELETE /api/plays/:id` - Delete play

## 🚢 Deployment

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your repository
3. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**:
     - `JWT_SECRET`: Your secret key
     - `PORT`: 3001 (or Render default)
4. Deploy!

### Frontend (Render Static Site)

1. Create a Static Site on Render
2. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL`: Your backend URL (e.g., `https://theatre-backend.onrender.com/api`)
3. Deploy!

## 📜 Scripts

- `npm run dev` - Start both frontend and backend in development
- `npm run dev:backend` - Start only backend server
- `npm run dev:frontend` - Start only frontend server
- `npm run build` - Build frontend for production
- `npm start` - Start production backend server
- `npm run install:all` - Install all dependencies

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, SQLite, JWT, bcrypt
- **Frontend**: React 18, React Router, Vite, Axios
- **UI**: React Calendar, FontAwesome icons
- **Database**: SQLite (portable, file-based)
- **Authentication**: JWT tokens with role-based access

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists in `backend/` with `JWT_SECRET` set
- Verify port 3001 is available

### Frontend can't connect to backend
- Check `VITE_API_URL` in `frontend/.env.production`
- Ensure backend is running
- Check CORS settings in `server.js`

### Database issues
- Delete `theater.db` and restart backend to recreate tables
- Check file permissions on database file

## 📞 Support

For issues or questions:
1. Check browser console for error messages
2. Check backend logs for server errors
3. Verify environment variables are set correctly

## 📄 License

MIT License - see LICENSE file for details

---

**LA KOMIKA Theatre System** - Built with ❤️ for the theatre community
