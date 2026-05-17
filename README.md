# Micro-Event Discovery Backend

A **location-aware social event discovery backend** built with **Node.js, Express, TypeScript, and MongoDB**.

This API powers a platform where users can discover nearby events, create/manage events, RSVP, comment, receive real-time notifications, and get automated event reminders.

---

## Overview

Many small local events happen every week but often go unnoticed because there is no lightweight platform focused on nearby micro-events.

This backend solves that by providing APIs for:

- Event discovery using geospatial queries
- Event creation and management
- Attendance tracking
- Social engagement through comments and replies
- Push notifications for event updates
- Automated event reminders

---

## Features

### Authentication & Security
- User registration and login
- JWT-based authentication
- OTP email verification
- Password reset flow
- Role-based authorization

### Event Management
- Create events
- Update event details
- Cancel / restore events
- Delete events
- Event image upload with Cloudinary
- Capacity enforcement

### Geolocation
- MongoDB geospatial indexing
- Nearby event discovery using `$near`

### Attendance System
RSVP statuses:

- Going
- Maybe
- Declined

Includes:

- Real-time attendee count updates
- Capacity validation
- Attendance state tracking

### Comments & Replies
- Comment on events
- Nested replies
- Edit/delete own comments

### Notifications
Firebase Cloud Messaging push notifications for:

- Event cancellation
- Event restoration
- Event updates
- New attendees
- Event reminders

### Background Jobs
Node-cron powered scheduled jobs for:

- Event reminder notifications
- Automatic account cleanup

### User Features
- Profile management
- Save/bookmark events
- Personal attendance history

---

## Tech Stack

### Backend
- Node.js
- Express.js
- TypeScript

### Database
- MongoDB
- Mongoose

### Services
- Firebase Cloud Messaging
- Cloudinary
- Nodemailer
- Node-cron

### Authentication
- JWT
- bcrypt

### Deployment
**Production Hosting:** Render

---

## 📂 Project Structure

```bash
├── models/
├── routes/
├── middleware/
├── services/
├── utils/
└── app.ts
