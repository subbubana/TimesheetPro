from fastapi import APIRouter, Request
from app.services.drive import drive, download_file
from app.utils.token import get_token, save_token
from app.config import settings

router = APIRouter(prefix="/webhook", tags=["Google Drive"])


@router.post("/drive")
async def drive_webhook(request: Request):
    print("webhook triggered")
    headers = request.headers

    # Ignore initial sync event
    if headers.get("X-Goog-Resource-State") == "sync":
        return {"status": "sync acknowledged"}

    page_token = get_token()

    response = drive.changes().list(
        pageToken=page_token,
        spaces="drive",
        fields="*",
    ).execute()

    print("Response is:")
    print(response)

    for change in response.get("changes", []):
        file = change.get("file")

        if not file:
            continue

        parents = file.get("parents", [])

        # Only download files from the configured folder
        if settings.google_drive_folder_id in parents:
            download_file(change["fileId"], file["name"])


    if "newStartPageToken" in response:
        save_token(response["newStartPageToken"])

    return {"status": "processed"}


