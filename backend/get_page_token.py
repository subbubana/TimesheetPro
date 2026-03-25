from google.oauth2 import service_account
from googleapiclient.discovery import build
from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/drive"]

creds = service_account.Credentials.from_service_account_file(
    settings.google_service_account_file,
    scopes=SCOPES,
)

drive = build("drive", "v3", credentials=creds)

token = drive.changes().getStartPageToken().execute()["startPageToken"]

print("START PAGE TOKEN:")
print(token)


