import uuid
from google.oauth2 import service_account
from googleapiclient.discovery import build
from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/drive"]

creds = service_account.Credentials.from_service_account_file(
    settings.google_service_account_file,
    scopes=SCOPES,
)

drive = build("drive", "v3", credentials=creds)

# ✅ STEP 1: Get the initial start page token
start_page_token = (
    drive.changes()
    .getStartPageToken()
    .execute()
    .get("startPageToken")
)

print("Start page token:", start_page_token)

# ✅ STEP 2: Register webhook using the page token
response = (
    drive.changes()
    .watch(
        pageToken=start_page_token,
        body={
            "id": str(uuid.uuid4()),
            "type": "web_hook",
            "address": "https://tegular-semimetaphorically-nieves.ngrok-free.dev/webhook/drive",
        },
    )
    .execute()
)

print("Webhook registered successfully")
print(response)



