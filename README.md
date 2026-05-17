Micro-Event Discovery Backend

A location-aware social event discovery backend built with Node.js, Express, TypeScript and MongoDB.

This API powers a platform where users can discover nearby events, create and manage events, RSVP, comment, receive real-time notifications and get automated event reminders.

Overview

Many small local events happen every week but often go unnoticed because there is no lightweight platform focused on nearby micro-events.

This backend solves that by providing APIs for:

Event discovery using geospatial queries
Event creation and management
Attendance tracking
Social engagement through comments and replies
Push notifications for event updates
Automated event reminders


Features:

Authentication & Security-
User registration and login
JWT-based authentication
OTP email verification
Password reset flow
Role-based authorization

Event Management-
Create events
Update event details
Cancel / restore events
Delete events
Event image upload with Cloudinary
Capacity enforcement

Geolocation-
MongoDB geospatial indexing
Nearby event discovery using $near

Attendance System-
RSVP statuses:
Going
Maybe
Declined
Real-time attendee count updates

Comments & Replies-
Comment on events
Nested replies
Update/delete own comments

Notifications-
Firebase Cloud Messaging push notifications for:
Event cancellation
Event restoration
Event updates
New attendees
Event reminders

Background Jobs-
Node-cron powered scheduled jobs for:
Event reminder notifications
Automatic account cleanup after deletion grace period

User Features-
Profile management
Save/bookmark events
View personal attendance history


Tech Stack

Backend:
Node.js
Express.js
TypeScript

Database:
MongoDB
Mongoose

Infrastructure / Services:
Firebase Cloud Messaging
Cloudinary
Nodemailer
Node-cron

Authentication:
JWT
bcrypt

Project Structure
├── models/
├── routes/
├── middleware/
├── services/
├── utils/
└── app.ts

Key Technical Implementations-

Geospatial Event Search:
Uses MongoDB 2dsphere indexing for efficient location-based queries.

Push Notification System:
Integrated Firebase Admin SDK for real-time event notifications.

Scheduled Reminder Engine:
Automated reminder dispatch system for attendees at configurable intervals before event start.

Attendance State Management:
Tracks RSVP transitions while maintaining accurate attendee counts.

Installation
Clone Repository
git clone https://github.com/YOUR_USERNAME/micro-event-backend.git
cd micro-event-backend
Install Dependencies
npm install
Configure Environment Variables

Create .env

PORT=
MONGO_URI=
JWT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EMAIL_USER=
EMAIL_PASS=

Add Firebase service account credentials.

Run Development Server
npm run dev
Example API Modules
Auth
Register
Login
Verify OTP
Reset Password
Events
Create event
Update event
Nearby events
Cancel / restore event
Attendance
Attend event
Update RSVP
Remove attendance
View attendees
Comments
Comment
Reply
Edit
Delete
Notifications
Fetch notification feed
Push delivery support
Architecture Highlights

This project focuses on:

Modular route separation
Typed Mongoose models
Middleware-driven authorization
Scalable notification delivery
Clean REST API structure
Future Improvements
WebSocket live event updates
Event recommendation engine
Analytics dashboard
Event popularity scoring
Rate limiting
API documentation with Swagger
Author

Built as part of a backend engineering portfolio project.

License

MIT
