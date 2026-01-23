# TimesheetPro - Quick Start Guide

This guide will help you get TimesheetPro up and running in minutes.

## Prerequisites

Install the following before starting:

1. **Python 3.11+**
   ```bash
   python --version
   ```

2. **Node.js 18+**
   ```bash
   node --version
   ```

3. **UV (Python package manager)**
   ```bash
   # Windows (PowerShell)
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

   # macOS/Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

4. **PostgreSQL** (via Docker or local installation)

## Step-by-Step Setup

### Step 1: Start PostgreSQL Database

Using Docker (recommended):
```bash
docker run --name timesheetpro-db \
  -e POSTGRES_USER=timesheetpro \
  -e POSTGRES_PASSWORD=timesheetpro \
  -e POSTGRES_DB=timesheetpro \
  -p 5432:5432 \
  -d postgres:16
```

To stop the database:
```bash
docker stop timesheetpro-db
```

To start it again later:
```bash
docker start timesheetpro-db
```

### Step 2: Set Up Backend

Open a terminal and navigate to the backend folder:

```bash
cd backend

# Install dependencies with UV
uv sync

# Create environment file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # macOS/Linux

# Run the backend server
uv run uvicorn app.main:app --reload
```

The backend will start at: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

Keep this terminal open!

### Step 3: Set Up Frontend

Open a NEW terminal and navigate to the frontend folder:

```bash
cd src

# Install dependencies
npm install

# Create environment file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # macOS/Linux

# Run the frontend development server
npm run dev
```

The frontend will start at: **http://localhost:3000**

Keep this terminal open too!

### Step 4: Access the Application

1. Open your browser and go to: **http://localhost:3000**
2. Click "Get Started" or "Sign Up"
3. Create your first account:
   - First Name: Your name
   - Last Name: Your last name
   - Email: your@email.com
   - Password: At least 8 characters
   - Role: Employee (or Admin for full access)
   - Submission Frequency: Weekly

4. After registration, you'll be redirected to login
5. Log in with your credentials
6. Start using TimesheetPro!

## First Steps in the App

### As an Employee:
1. Go to **Dashboard** to see your overview
2. Click **New Timesheet** to create your first timesheet
3. Fill in the daily hours
4. Submit for approval

### As an Admin:
1. Create a **Client** (Clients menu)
   - Name: "Sample Client"
   - Code: "SC001"
   - Set overtime thresholds

2. Create a **Calendar** (Calendars menu)
   - Name: "US Holidays 2026"
   - Add holidays as needed

3. View **Employees** to see all registered users

4. Create **Configurations** for system settings

## Running Tests

### Backend Tests
```bash
cd backend
uv run pytest
```

With coverage report:
```bash
uv run pytest --cov=app --cov-report=html
```

## Common Issues

### Backend won't start
- Make sure PostgreSQL is running: `docker ps`
- Check the connection string in `backend/.env`
- Verify UV is installed: `uv --version`

### Frontend won't start
- Make sure you ran `npm install`
- Check Node.js version: `node --version` (needs 18+)
- Delete `node_modules` and run `npm install` again

### Database connection errors
- Make sure PostgreSQL container is running
- Check the DATABASE_URL in `backend/.env`
- Default: `postgresql://timesheetpro:timesheetpro@localhost:5432/timesheetpro`

### CORS errors
- Make sure backend is running on port 8000
- Make sure frontend is running on port 3000
- Check CORS settings in `backend/app/main.py`

## Development Workflow

### Daily Development

Terminal 1 - Backend:
```bash
cd backend
uv run uvicorn app.main:app --reload
```

Terminal 2 - Frontend:
```bash
cd src
npm run dev
```

Terminal 3 - Database (if needed):
```bash
docker start timesheetpro-db
```

### Making Changes

- Backend changes: Edit files in `backend/app/`, server auto-reloads
- Frontend changes: Edit files in `src/src/`, browser auto-refreshes
- Database models: After changing models, recreate the database or use migrations

### Testing Your Changes

After making changes:
1. Test manually in the browser
2. Run backend tests: `cd backend && uv run pytest`
3. Check API docs: http://localhost:8000/docs

## Stopping the Application

1. Press `Ctrl+C` in both terminal windows (backend and frontend)
2. Optionally stop the database:
   ```bash
   docker stop timesheetpro-db
   ```

## Next Steps

- Read the full documentation in `README.md`
- Check detailed specifications in `TIMESHEET_README.md`
- Explore API documentation at http://localhost:8000/docs
- Customize the application for your needs

## Support

For detailed information about:
- Database models and schemas
- API endpoints and responses
- Frontend components and routing
- Authentication and authorization

Refer to the README files in `backend/` and `src/` directories.

## Production Deployment

For production deployment instructions, see:
- Backend: `backend/README.md`
- Frontend: Build with `npm run build` and serve the `dist/` folder

Happy timesheet tracking! 🎉
