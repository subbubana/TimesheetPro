from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",
    )

    database_url: str = "postgresql://timesheetpro:timesheetpro@localhost:5432/timesheetpro"
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 7

    # ✅ MUST be snake_case
    google_drive_folder_id: str
    google_service_account_file: str
    google_drive_download_dir: str = "./downloads"


settings = Settings()
