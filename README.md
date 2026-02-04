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

### Option 1: Docker (Recommended)

The easiest way to run TimesheetPro is using Docker Compose.

**Prerequisites:**
- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

---

#### 🚀 Fresh Setup (First Time)

1. **Navigate to the project folder:**
   ```bash
   cd timesheetpro
   ```

2. **Start all services with build:**
   ```bash
   docker compose up --build
   ```

   This will:
   - 🐘 Start PostgreSQL database on port 5432
   - 🔄 Run database migrations automatically via Alembic
   - 👤 Create the default admin user (`admin@timesheetpro.com` / `1234`)
   - 🖥️ Start the backend API on port 8000
   - 🌐 Start the frontend on port 3000

3. **Access the application:**
   | Service | URL |
   |---------|-----|
   | Frontend | http://localhost:3000 |
   | Backend API | http://localhost:8000 |
   | API Docs (Swagger) | http://localhost:8000/docs |

---

#### 🔄 Reusing Existing Containers

After the initial setup, use these commands to manage your containers:

| Command | Description |
|---------|-------------|
| `docker compose up` | Start existing containers (no rebuild) |
| `docker compose up -d` | Start in detached mode (background) |
| `docker compose stop` | Stop containers but keep data |
| `docker compose start` | Restart stopped containers |
| `docker compose down` | Stop and remove containers (keeps data volume) |
| `docker compose down -v` | Stop, remove containers, **and delete all data** |
| `docker compose logs -f` | View live logs from all services |
| `docker compose logs -f backend` | View logs for backend only |

---

#### 🔧 Common Docker Commands

```bash
# Rebuild only the backend after code changes
docker compose up --build backend

# Rebuild only the frontend
docker compose up --build frontend

# Reset the database completely (fresh start)
docker compose down -v && docker compose up --build

# View running containers
docker compose ps

# Access the PostgreSQL database directly
docker exec -it timesheetpro-db psql -U timesheetpro -d timesheetpro

# Access the backend container shell
docker exec -it timesheetpro-backend sh
```

---

#### 🧹 Troubleshooting

**If admin user creation fails or you see enum errors:**
```bash
# Reset the database and rebuild
docker compose down -v
docker compose up --build
```

**If ports are already in use:**
```bash
# Check what's using the port
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Or change ports in docker-compose.yml
```

**If containers won't start:**
```bash
# View detailed logs
docker compose logs

# Force rebuild from scratch
docker compose build --no-cache
docker compose up
```

---

### 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@timesheetpro.com | 1234 |

---

### 👥 How to Onboard Employees

After logging in as admin, follow these steps to set up your organization:

#### Step 1: Create Clients/Projects

1. Navigate to **Clients** in the sidebar
2. Click **"Add Client"**
3. Fill in client details:
   - **Name**: Company/project name
   - **Code**: Short unique identifier (e.g., "ACME")
   - **Bill Rate**: Hourly rate for this client
   - **Week Start Day**: When their work week begins
   - **Overtime Thresholds**: Daily (8h) and weekly (40h) limits
4. Click **Save**

#### Step 2: Create Employees

1. Navigate to **Employees** in the sidebar
2. Click **"Add Employee"**
3. Fill in employee details:
   - **Email**: Employee's login email
   - **First/Last Name**: Full name
   - **Role**: Choose from Employee, Manager, Finance, or Admin
   - **Submission Frequency**: Weekly, Biweekly, or Monthly
   - **Manager**: Assign a manager (optional)
   - **Pay Rate**: Hourly pay rate
4. Click **Save**

> **Note**: After creating an employee, they can register using the `/auth/register` endpoint with their email to set their password.

#### Step 3: Assign Employees to Clients

1. Go to **Employees** → Select an employee
2. Click **"Manage Assignments"**
3. Add client assignments:
   - Select the client
   - Set start/end dates (optional)
   - Override pay rate if needed
4. Click **Save**

#### Step 4: Set Up Holiday Calendars (Optional)

1. Navigate to **Calendars** in the sidebar
2. Create a new calendar for each client/region
3. Add holiday dates that should be flagged in timesheets
4. Link calendars to clients

---

### 📝 Employee Workflow

Once employees are onboarded, they can:

1. **Login** at http://localhost:3000/login
2. **Create Timesheets**: 
   - Select client and date range
   - Enter daily hours worked
   - Add descriptions/notes
3. **Submit for Approval**: Click "Submit" when ready
4. **Track Status**: View pending/approved/rejected timesheets

---

### ✅ Manager/Admin Workflow

Managers and admins can:

1. **View All Timesheets**: See submitted timesheets from all employees
2. **Approve/Reject**: Review and approve or reject with comments
3. **Generate Reports**: Export timesheet data
4. **Manage Settings**: Update system configurations

---

To stop the services:
```bash
docker compose down
```

To stop and remove all data:
```bash
docker compose down -v
```

---

### Option 2: Manual Setup

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
