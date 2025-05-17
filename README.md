# MindfulMeet: Mental Health Support App

MindfulMeet is a cross-platform mobile application designed to connect users with mental health resources, events, and supportive communities. The app helps users discover wellness events, track their mental health journey, and engage with others in a supportive environment.

![MindfulMeet](https://via.placeholder.com/800x400?text=MindfulMeet+App)

## 📱 Features

- **User Authentication**: Secure login and registration system
- **Event Discovery**: Find meditation workshops, support groups, and wellness events
- **RSVP System**: Register for events and track attendance
- **Real-time Chat**: Connect with support members in individual or group chats
- **Wellness Tracking**: Monitor mood, meditation practice, and mental health progress
- **User Profiles**: Customize profiles with wellness goals and interests

## 🛠️ Technology Stack

### Backend
- **Node.js** & **Express**: Server and API framework
- **MySQL**: Database (with Sequelize ORM)
- **JWT**: Authentication
- **Socket.io**: Real-time communication

### Frontend (In Development)
- **React Native**: Cross-platform mobile app framework
- **Redux**: State management
- **Axios**: API requests
- **React Navigation**: Navigation system

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- MySQL (via XAMPP or standalone installation)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dantarus685/MindfullMeet-App.git
   cd MindfullMeet-App
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the backend directory:
   ```
   NODE_ENV=development
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=mindfulmeet_app
   JWT_SECRET=your_secure_jwt_secret
   JWT_EXPIRES_IN=90d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Create database**
   - Start XAMPP and make sure MySQL is running
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Create a new database named `mindfulmeet_app`

5. **Start the backend server**
   ```bash
   npm run dev
   ```
   This will start the server at http://localhost:5000

## 📖 API Documentation

### Authentication Endpoints

| Method | Endpoint         | Description      | Authentication |
|--------|------------------|------------------|---------------|
| POST   | /api/auth/signup | Register new user | No            |
| POST   | /api/auth/login  | Login            | No            |

### Event Endpoints

| Method | Endpoint                   | Description             | Authentication |
|--------|----------------------------|-------------------------|---------------|
| GET    | /api/events                | Get all events          | No            |
| GET    | /api/events/:id            | Get event by ID         | No            |
| POST   | /api/events                | Create event            | Yes           |
| PATCH  | /api/events/:id            | Update event            | Yes (host)    |
| DELETE | /api/events/:id            | Delete event            | Yes (host)    |
| GET    | /api/events/types/stats    | Get event type stats    | No            |
| POST   | /api/events/:id/rsvp       | RSVP to event           | Yes           |
| GET    | /api/events/:id/attendees  | Get event attendees     | Yes           |
| POST   | /api/events/:id/comments   | Add comment             | Yes           |
| GET    | /api/events/:id/comments   | Get event comments      | No            |

### User Endpoints

| Method | Endpoint            | Description         | Authentication |
|--------|---------------------|---------------------|---------------|
| GET    | /api/users/profile  | Get user profile    | Yes           |
| PATCH  | /api/users/profile  | Update user profile | Yes           |
| GET    | /api/users/events   | Get user's events   | Yes           |

### Wellness Tracking Endpoints

| Method | Endpoint              | Description           | Authentication |
|--------|-----------------------|-----------------------|---------------|
| POST   | /api/tracking         | Create tracking entry | Yes           |
| GET    | /api/tracking/history | Get tracking history  | Yes           |

### Support Chat Endpoints

| Method | Endpoint                     | Description       | Authentication |
|--------|------------------------------|-------------------|---------------|
| POST   | /api/support/rooms           | Create chat room  | Yes           |
| GET    | /api/support/rooms           | Get user's rooms  | Yes           |
| GET    | /api/support/rooms/:id/messages | Get room messages | Yes           |

## 📂 Project Structure

```
mindfulmeet/
├── backend/                  # Node.js Express backend
│   ├── config/               # Configuration files
│   ├── controllers/          # Route controllers
│   ├── middleware/           # Middleware functions
│   ├── models/               # Database models (Sequelize)
│   ├── routes/               # API routes
│   ├── .env                  # Environment variables
│   ├── app.js                # Express application
│   └── server.js             # Server entry point
│
└── frontend/                 # React Native app (coming soon)
    ├── src/
    │   ├── components/       # Reusable UI components
    │   ├── screens/          # App screens
    │   ├── navigation/       # Navigation configuration
    │   ├── redux/            # State management
    │   ├── services/         # API services
    │   └── utils/            # Helper functions
    └── App.js                # Main app component
```

## ✅ Current Status

- ✅ Database setup with MySQL
- ✅ User authentication system
- ✅ Event management functionality
- ✅ RSVP and comments system
- ✅ Basic w