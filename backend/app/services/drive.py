import io
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

creds = service_account.Credentials.from_service_account_file(
    settings.google_service_account_file,
    scopes=SCOPES,
)

drive = build("drive", "v3", credentials=creds)

os.makedirs(settings.google_drive_download_dir, exist_ok=True)


def download_file(file_id: str, filename: str):
    path = os.path.join(settings.google_drive_download_dir, filename)

    request = drive.files().get_media(fileId=file_id)
    fh = io.FileIO(path, "wb")

    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    print(f"✅ Downloaded: {filename}")


