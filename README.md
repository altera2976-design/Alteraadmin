# Employee Management System - Phase 1

This repository contains the complete Phase 1 implementation of the Employee Management System.

## Project Structure

- `backend/`: Node.js + Express + MongoDB Atlas API
- `admin-web/`: React + Vite web dashboard for administrators
- `/`: Expo React Native mobile application for employees

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB Atlas account and cluster
- Expo Go app on your physical device OR Android Studio Emulator

---

## 1. Backend Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create your environment file:
   - Copy `backend/.env.example` to `backend/.env`
   - Fill in your MongoDB Atlas connection string (`MONGODB_URI`)
   - Ensure the default admin credentials (`ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) are set.
3. Seed the admin user to the database:
   ```bash
   npm run seed:admin
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   _The backend will run at http://localhost:5001_

---

## 2. Admin Web Setup

1. Open a new terminal and navigate to the admin-web folder:
   ```bash
   cd admin-web
   ```
2. Create your environment file:
   - Copy `admin-web/.env.example` to `admin-web/.env`
   - By default, it uses `VITE_API_URL=http://localhost:5001/api` for local development.
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   _The admin panel will be accessible at http://localhost:5173_

---

## 3. Mobile App Setup

1. Open a new terminal in the root directory (`attendance-payroll-app`):
2. Open `app.json` and review the `extra` section.
   - If you are using an **Android Emulator**, the default `http://10.0.2.2:5001/api` works perfectly.
   - If you are testing on a **Physical Device with Expo Go**, you **MUST** change `apiUrl` in `app.json` to your laptop's local IP network address (e.g., `http://192.168.1.xxx:5001/api`).
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with your Expo Go app, or press `a` to open in the Android emulator.

---

## Features Implemented in Phase 1

- **Backend Architecture**: MongoDB models, JWT authentication, centralized error handling.
- **Admin Roles**: Secure routes for administration, dynamic seeding script.
- **Admin Dashboard**: Web portal to add, edit, view, and toggle statuses (Active/Inactive) of employees.
- **Mobile Employee Portal**: Login via Expo secure-store, Profile viewing, and Dashboard layout with locked upcoming features.
