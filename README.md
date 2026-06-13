<div align="center">

# 📅 AI Calendar — Smart Scheduling App

**An AI-powered calendar and task management mobile app built with Flutter + Node.js + Firebase + OpenAI**

[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Email/password login & signup via Firebase Auth |
| 📅 **Calendar** | Monthly, weekly, and daily views with event management |
| ✅ **Task Manager** | Full to-do system with priorities, filters, and due dates |
| 🤖 **AI Input** | Type naturally — *"Meeting tomorrow at 5"* → auto-created event |
| ⚡ **Smart Scheduling** | Auto-detects conflicts, suggests free time slots |
| 🔔 **Notifications** | Push reminders for events and tasks |
| 🎨 **Dark UI** | Premium dark theme with indigo + amber accents |

---

## 🛠 Tech Stack

### Frontend
- **Flutter** (Dart) — cross-platform mobile app
- **Riverpod** — state management
- **table_calendar** — calendar widget
- **flutter_animate** — UI animations
- **Google Fonts** — Syne + Inter typography

### Backend
- **Node.js + Express** — REST API server
- **OpenAI API (GPT-4)** — natural language parsing & smart scheduling
- **Firebase Admin SDK** — server-side Firestore access

### Database & Services
- **Firebase Firestore** — NoSQL real-time database
- **Firebase Auth** — secure authentication
- **Firebase Cloud Messaging** — push notifications

---

## 📁 Project Structure

```
ai-calendar/
│
├── flutter_app/                      # Flutter mobile app
│   ├── lib/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── auth_service.dart         # Firebase Auth wrapper
│   │   │   │   ├── ai_service.dart           # OpenAI API client
│   │   │   │   └── notification_service.dart # FCM + local notifications
│   │   │   └── utils/
│   │   │
│   │   ├── data/
│   │   │   ├── models/
│   │   │   │   └── event_model.dart          # CalendarEvent, Task, enums
│   │   │   └── repositories/
│   │   │       └── event_repository.dart     # Firestore CRUD operations
│   │   │
│   │   └── presentation/
│   │       ├── theme/
│   │       │   └── app_theme.dart            # Design system & colors
│   │       ├── providers/
│   │       │   └── app_providers.dart        # Riverpod state providers
│   │       └── screens/
│   │           ├── auth/                     # Login & signup screens
│   │           ├── home/                     # Dashboard & shell nav
│   │           ├── calendar/                 # Calendar + event screens
│   │           ├── tasks/                    # Task management screens
│   │           └── ai_input/                 # AI natural language input
│   │
│   └── pubspec.yaml
│
├── backend/                           # Node.js API server
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.js        # NLP parsing + scheduling
│   │   │   └── eventController.js     # Event CRUD endpoints
│   │   ├── middleware/
│   │   │   └── authMiddleware.js      # Firebase token verification
│   │   ├── routes/
│   │   │   └── index.js              # API route definitions
│   │   ├── services/
│   │   │   └── openaiService.js      # OpenAI integration logic
│   │   └── index.js                  # Express server entry point
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:

| Tool | Version | Download |
|---|---|---|
| Flutter | 3.x+ | [flutter.dev](https://flutter.dev/docs/get-started/install) |
| Dart | 3.x+ | Included with Flutter |
| Node.js | 18.x+ | [nodejs.org](https://nodejs.org) |
| npm | 9.x+ | Included with Node.js |
| Firebase CLI | latest | `npm install -g firebase-tools` |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/ai-calendar.git
cd ai-calendar
```

---

### Step 2 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → **Create a new project**

2. Enable the following services:
   - **Authentication** → Sign-in method → Email/Password ✅
   - **Firestore Database** → Create database (start in test mode for dev)
   - **Cloud Messaging** → Enabled by default

3. Add apps to your Firebase project:
   - Click **Add app** → Android → follow the setup wizard
   - Click **Add app** → iOS → follow the setup wizard

4. Download config files:
   - Android: `google-services.json` → place in `flutter_app/android/app/`
   - iOS: `GoogleService-Info.plist` → place in `flutter_app/ios/Runner/`

5. Set up Firestore security rules (in Firebase Console → Firestore → Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Generate Firebase Admin SDK key (for backend):
   - Firebase Console → Project Settings → Service Accounts
   - Click **Generate new private key** → download JSON

---

### Step 3 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
```

Edit `.env` with your values:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
PORT=3000
NODE_ENV=development
```

```bash
# Start the backend server
npm run dev

# Server will run at http://localhost:3000
```

---

### Step 4 — Flutter App Setup

```bash
cd flutter_app

# Install Flutter dependencies
flutter pub get

# Generate code (Riverpod, Freezed, etc.)
flutter pub run build_runner build --delete-conflicting-outputs

# Update backend URL in lib/core/services/auth_service.dart
# Find this line and update it:
# static const String _baseUrl = 'https://your-backend-api.com';
```

```bash
# Run on Android
flutter run

# Run on iOS (Mac only)
cd ios && pod install && cd ..
flutter run

# Run on a specific device
flutter devices
flutter run -d <device-id>
```

---

## 🔑 Environment Variables Reference

### Backend `.env`

| Variable | Description | Required |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ |
| `FIREBASE_PROJECT_ID` | Firebase project ID | ✅ |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key | ✅ |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK client email | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |
| `NODE_ENV` | `development` or `production` | ❌ |

### Flutter

Update `lib/core/services/auth_service.dart`:

```dart
static const String _baseUrl = 'https://your-deployed-backend.com';
```

---

## 🤖 AI Features — How They Work

### Natural Language Input
Users type something like:
> *"Team standup tomorrow at 9am for 30 minutes"*

The app sends this to the backend, which calls **GPT-4** with a structured prompt. GPT-4 returns:
```json
{
  "title": "Team standup",
  "start_time": "2026-06-14T09:00:00",
  "end_time": "2026-06-14T09:30:00",
  "category": "work",
  "confidence": 0.97
}
```
The event is then saved to Firestore automatically.

### Smart Scheduling
If a task has no time assigned:
1. The app fetches existing events for the day
2. Sends them to the backend with the task details
3. GPT-4 suggests the best available time slot
4. User confirms → event is created

### Conflict Detection
Every time an event is created or edited:
- Firestore is queried for overlapping events
- If conflicts are found, the user is warned
- User can override or pick a suggested free slot

---

## 📱 Screens Overview

| Screen | Description |
|---|---|
| **Login / Signup** | Firebase email auth with form validation |
| **Dashboard** | Today's summary, task stats, upcoming events |
| **Calendar** | Monthly/weekly view with event markers |
| **Event Detail** | Full event info with edit/delete |
| **Create Event** | Form with time picker, category, location, reminders |
| **Tasks** | Filterable task list (All / Today / Pending / Overdue) |
| **AI Input** | Natural language sheet — type to create events |

---

## 🗃 Firestore Database Schema

```
users/
  {userId}/
    events/
      {eventId}/
        title: string
        description: string?
        startTime: timestamp
        endTime: timestamp
        isAllDay: boolean
        category: string          # work | personal | health | social | ...
        location: string?
        attendees: string[]
        reminders: [{minutesBefore, type}]
        isAiGenerated: boolean
        aiRawInput: string?       # original NL input
        createdAt: timestamp
        updatedAt: timestamp

    tasks/
      {taskId}/
        title: string
        description: string?
        priority: string          # low | medium | high | urgent
        status: string            # pending | in_progress | completed
        dueDate: timestamp?
        scheduledStart: timestamp?
        scheduledEnd: timestamp?
        linkedEventId: string?    # optional link to an event
        tags: string[]
        isAiScheduled: boolean
        completedAt: timestamp?
        createdAt: timestamp
        updatedAt: timestamp
```

---

## 🚢 Deployment

### Backend — Deploy to Railway / Render / Fly.io

```bash
# Using Railway (recommended)
npm install -g @railway/cli
railway login
railway init
railway up
```

Or deploy to **Render**:
1. Push backend folder to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set all environment variables in Render dashboard
4. Deploy

### Flutter — Build for Release

```bash
# Android APK
flutter build apk --release

# Android App Bundle (for Play Store)
flutter build appbundle --release

# iOS (Mac only)
flutter build ios --release
```

---

## 🧪 Running Tests

```bash
# Flutter tests
cd flutter_app
flutter test

# Backend tests
cd backend
npm test
```

---

## 🔒 Security Notes

- Never commit `google-services.json`, `GoogleService-Info.plist`, or `.env`
- All Firestore rules require authenticated user access
- Backend verifies Firebase ID tokens on every request
- OpenAI API key is server-side only — never exposed to the client

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙋 Support

If you run into issues:
- Check [Flutter docs](https://docs.flutter.dev)
- Check [Firebase docs](https://firebase.google.com/docs)
- Open a GitHub [Issue](https://github.com/yourusername/ai-calendar/issues)

---

<div align="center">

Built with ❤️ using Flutter, Firebase & OpenAI

</div>
