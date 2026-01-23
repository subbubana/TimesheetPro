# TimesheetPro Frontend

React frontend application for TimesheetPro timesheet management system.

## Technologies

- React 18
- React Router v6
- Tailwind CSS
- Axios
- Vite
- Lucide React (icons)
- date-fns

## Setup

1. Install dependencies:
```bash
cd src
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env if needed (default API URL: http://localhost:8000)
```

3. Start development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Project Structure

```
src/
├── api/
│   └── client.js          # API client and endpoints
├── components/
│   ├── Layout.jsx         # Main layout with sidebar
│   └── ProtectedRoute.jsx # Route protection wrapper
├── context/
│   └── AuthContext.jsx    # Authentication context
├── pages/
│   ├── Landing.jsx        # Landing page
│   ├── Login.jsx          # Login page
│   ├── Register.jsx       # Registration page
│   ├── Dashboard.jsx      # Dashboard
│   ├── Timesheets.jsx     # Timesheets list
│   ├── TimesheetForm.jsx  # Create timesheet
│   ├── Employees.jsx      # Employee management
│   ├── Clients.jsx        # Client management
│   ├── Calendars.jsx      # Calendar management
│   └── Configurations.jsx # System configurations
├── App.jsx                # Main app component with routing
├── main.jsx               # Application entry point
└── index.css              # Global styles and Tailwind

## Features

### Authentication
- User registration with role selection
- Login with JWT token authentication
- Automatic token refresh
- Protected routes based on user roles

### Dashboard
- Overview of timesheet statistics
- Recent timesheets
- Quick actions

### Timesheet Management
- Create timesheets with daily breakdown
- Submit timesheets for approval
- View timesheet history
- Filter by status

### Employee Management (Manager/Finance/Admin)
- View all employees
- Role-based access control

### Client Management (Manager/Finance/Admin)
- Create and manage clients
- Set overtime thresholds
- View client details

### Calendar Management (Manager/Admin)
- Create holiday calendars
- Manage holidays

### Configurations (Admin only)
- System-wide configuration management
- Key-value configuration storage

## User Roles

- **Employee**: Submit and view own timesheets
- **Manager**: Approve timesheets, view subordinates, manage clients
- **Finance**: View all timesheets, generate reports, manage clients
- **Admin**: Full system access, manage configurations

## API Integration

The frontend communicates with the FastAPI backend through Axios. All API calls include JWT authentication tokens automatically.

Base API URL: `http://localhost:8000` (configurable via `.env`)
