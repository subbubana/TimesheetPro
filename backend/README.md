# TimesheetPro Backend

FastAPI backend for TimesheetPro timesheet management system.

## Setup

1. Install UV (if not already installed):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. Install dependencies:
```bash
cd backend
uv sync
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run the database (PostgreSQL):
```bash
# Using Docker
docker run --name timesheetpro-db \
  -e POSTGRES_USER=timesheetpro \
  -e POSTGRES_PASSWORD=timesheetpro \
  -e POSTGRES_DB=timesheetpro \
  -p 5432:5432 \
  -d postgres:16
```

5. Run the application:
```bash
uv run uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000
API documentation: http://localhost:8000/docs

## Running Tests

```bash
uv run pytest
```

With coverage:
```bash
uv run pytest --cov=app --cov-report=html
```

## API Endpoints

### Authentication
- POST `/auth/register` - Register new employee
- POST `/auth/login` - Login
- GET `/auth/me` - Get current user
- POST `/auth/refresh` - Refresh access token

### Employees
- GET `/employees/` - List employees (Manager/Admin/Finance)
- GET `/employees/{id}` - Get employee details
- PUT `/employees/{id}` - Update employee
- DELETE `/employees/{id}` - Deactivate employee (Admin)

### Clients
- POST `/clients/` - Create client (Admin)
- GET `/clients/` - List clients
- GET `/clients/{id}` - Get client details
- PUT `/clients/{id}` - Update client (Admin)
- DELETE `/clients/{id}` - Deactivate client (Admin)

### Timesheets
- POST `/timesheets/` - Create timesheet
- GET `/timesheets/` - List timesheets
- GET `/timesheets/{id}` - Get timesheet details
- PUT `/timesheets/{id}` - Update timesheet
- DELETE `/timesheets/{id}` - Delete draft timesheet
- POST `/timesheets/{id}/submit` - Submit timesheet

### Approvals
- GET `/approvals/` - List approvals (Manager/Admin)
- GET `/approvals/{id}` - Get approval details
- PUT `/approvals/{id}` - Update approval
- POST `/approvals/timesheet/{id}` - Create approval for timesheet

### Calendars
- POST `/calendars/` - Create calendar (Admin)
- GET `/calendars/` - List calendars
- GET `/calendars/{id}` - Get calendar details
- PUT `/calendars/{id}` - Update calendar (Admin)
- POST `/calendars/{id}/holidays` - Add holiday (Admin)
- GET `/calendars/{id}/holidays` - List holidays

### Configurations
- POST `/configurations/` - Create configuration (Admin)
- GET `/configurations/` - List configurations
- GET `/configurations/{id}` - Get configuration
- GET `/configurations/key/{key}` - Get configuration by key
- PUT `/configurations/{id}` - Update configuration (Admin)
- DELETE `/configurations/{id}` - Delete configuration (Admin)

## Database Models

- **employees** - Employee records
- **clients** - Client/project information
- **timesheets** - Timesheet headers
- **timesheet_details** - Daily timesheet entries
- **approvals** - Approval workflow
- **calendars** - Holiday calendars
- **holidays** - Holiday definitions
- **notifications** - Notification log
- **configurations** - System configurations
- **audit_log** - Audit trail
