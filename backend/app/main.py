from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, employees, clients, timesheets, approvals, calendars, configurations, notifications, dashboard, timesheets_upload, integrations, monitoring, webhooks


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TimesheetPro API",
    description="Timesheet management system API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(clients.router)
app.include_router(timesheets.router)
app.include_router(approvals.router)
app.include_router(calendars.router)
app.include_router(configurations.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(timesheets_upload.router)
app.include_router(integrations.router)
app.include_router(monitoring.router)
app.include_router(webhooks.router)

from app.scheduler import start_scheduler

# Start background scheduler for polling (Email & Drive)
@app.on_event("startup")
def startup_event():
    start_scheduler()


@app.get("/")
def read_root():
    return {"message": "Welcome to TimesheetPro API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
