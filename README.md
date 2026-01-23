# TimesheetPro

A comprehensive timesheet management system built with FastAPI and React.

## Project Structure

```
timesheetpro/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── routers/     # API route handlers
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── auth.py      # Authentication utilities
│   │   ├── config.py    # Configuration settings
│   │   ├── database.py  # Database connection
│   │   └── main.py      # FastAPI app
│   ├── tests/           # Pytest tests
│   ├── pyproject.toml   # UV project configuration
│   └── README.md
│
├── src/                 # React frontend
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # React components
│   │   ├── context/    # React context
│   │   ├── pages/      # Page components
│   │   ├── App.jsx     # Main app
│   │   └── main.jsx    # Entry point
│   ├── package.json
│   └── README.md
│
└── TIMESHEET_README.md  # Detailed specifications
```

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Database
- **SQLAlchemy**: ORM
- **Pydantic**: Data validation
- **JWT**: Authentication
- **pytest**: Testing
- **UV**: Package manager

### Frontend
- **React 18**: UI library
- **Tailwind CSS**: Styling
- **React Router**: Navigation
- **Axios**: HTTP client
- **Vite**: Build tool

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- UV package manager

### Backend Setup

1. Start PostgreSQL:
```bash
docker run --name timesheetpro-db \
  -e POSTGRES_USER=timesheetpro \
  -e POSTGRES_PASSWORD=timesheetpro \
  -e POSTGRES_DB=timesheetpro \
  -p 5432:5432 \
  -d postgres:16
```

2. Install backend dependencies:
```bash
cd backend
uv sync
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the backend:
```bash
uv run uvicorn app.main:app --reload
```

Backend will be available at: http://localhost:8000
API docs: http://localhost:8000/docs

### Frontend Setup

1. Install frontend dependencies:
```bash
cd src
npm install
```

2. Set up environment:
```bash
cp .env.example .env
```

3. Run the frontend:
```bash
npm run dev
```

Frontend will be available at: http://localhost:3000

## Testing

### Backend Tests
```bash
cd backend
uv run pytest
```

With coverage:
```bash
uv run pytest --cov=app --cov-report=html
```

## Features

### Core Functionality
- ✅ User authentication with JWT
- ✅ Role-based access control (Employee, Manager, Finance, Admin)
- ✅ Timesheet creation and submission
- ✅ Multi-level approval workflow
- ✅ Employee management
- ✅ Client management with overtime thresholds
- ✅ Holiday calendar management
- ✅ System configuration management
- ✅ Audit logging

### Database Models (10 tables)
1. **employees** - Employee records and authentication
2. **clients** - Client/project information
3. **timesheets** - Timesheet headers
4. **timesheet_details** - Daily hour entries
5. **approvals** - Approval workflow tracking
6. **calendars** - Holiday calendar definitions
7. **holidays** - Holiday dates
8. **notifications** - Notification log
9. **configurations** - System settings
10. **audit_log** - Audit trail

### MVP/Phase 1 (Current Implementation)
- Core timesheet submission and review
- Basic validation (hours thresholds, holiday flagging)
- JWT authentication
- All essential UI pages
- Complete REST API
- Comprehensive test coverage

### Future Enhancements (Phase 2+)
- Email/Drive integration for timesheet collection
- LangGraph AI agent workflows
- QuickBooks integration
- Advanced reporting and analytics
- Automated notifications and reminders
- File upload support (Excel, PDF, CSV)

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh token

### Timesheets
- `POST /timesheets/` - Create timesheet
- `GET /timesheets/` - List timesheets
- `GET /timesheets/{id}` - Get timesheet
- `PUT /timesheets/{id}` - Update timesheet
- `DELETE /timesheets/{id}` - Delete timesheet
- `POST /timesheets/{id}/submit` - Submit timesheet

### Employees (Manager/Admin)
- `GET /employees/` - List employees
- `GET /employees/{id}` - Get employee
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Deactivate employee

### Clients (Manager/Admin)
- `POST /clients/` - Create client
- `GET /clients/` - List clients
- `GET /clients/{id}` - Get client
- `PUT /clients/{id}` - Update client
- `DELETE /clients/{id}` - Deactivate client

### Approvals (Manager/Admin)
- `GET /approvals/` - List approvals
- `GET /approvals/{id}` - Get approval
- `PUT /approvals/{id}` - Update approval
- `POST /approvals/timesheet/{id}` - Create approval

### Calendars (Manager/Admin)
- `POST /calendars/` - Create calendar
- `GET /calendars/` - List calendars
- `GET /calendars/{id}` - Get calendar
- `PUT /calendars/{id}` - Update calendar
- `POST /calendars/{id}/holidays` - Add holiday
- `GET /calendars/{id}/holidays` - List holidays

### Configurations (Admin)
- `POST /configurations/` - Create config
- `GET /configurations/` - List configs
- `GET /configurations/{id}` - Get config
- `GET /configurations/key/{key}` - Get by key
- `PUT /configurations/{id}` - Update config
- `DELETE /configurations/{id}` - Delete config

## User Roles & Permissions

| Feature | Employee | Manager | Finance | Admin |
|---------|----------|---------|---------|-------|
| Submit Timesheets | ✅ | ✅ | ✅ | ✅ |
| View Own Timesheets | ✅ | ✅ | ✅ | ✅ |
| View All Timesheets | ❌ | ✅ | ✅ | ✅ |
| Approve Timesheets | ❌ | ✅ | ❌ | ✅ |
| Manage Employees | ❌ | ✅ | ✅ | ✅ |
| Manage Clients | ❌ | ✅ | ✅ | ✅ |
| Manage Calendars | ❌ | ✅ | ❌ | ✅ |
| System Configuration | ❌ | ❌ | ❌ | ✅ |

## Development

### Code Structure
- **Backend**: FastAPI with modular routers
- **Frontend**: Component-based React architecture
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with refresh
- **Testing**: Comprehensive pytest coverage

### Adding New Features
1. Create database models in `backend/app/models.py`
2. Define Pydantic schemas in `backend/app/schemas.py`
3. Implement API routes in `backend/app/routers/`
4. Write tests in `backend/tests/`
5. Create React pages in `src/src/pages/`
6. Add API calls to `src/src/api/client.js`
7. Update routing in `src/src/App.jsx`

## License

Proprietary - All rights reserved

## Support

For issues and questions, please refer to the detailed documentation in `TIMESHEET_README.md`.
