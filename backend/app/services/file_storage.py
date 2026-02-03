"""
File storage utilities for timesheet uploads.
Handles saving, retrieving, and managing uploaded timesheet files.
"""
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional
import hashlib


# Base upload directory
UPLOAD_BASE_DIR = Path(os.getenv("UPLOAD_DIR", "uploads/timesheets"))


def get_employee_upload_path(employee_id: int) -> Path:
    """
    Get the upload directory path for a specific employee.
    Creates directory structure: uploads/timesheets/{employee_id}/{year}/{month}/
    """
    now = datetime.now()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    
    path = UPLOAD_BASE_DIR / str(employee_id) / year / month
    path.mkdir(parents=True, exist_ok=True)
    
    return path


def generate_unique_filename(original_filename: str, employee_id: int) -> str:
    """
    Generate a unique filename to prevent collisions.
    Format: {timestamp}_{hash}_{original_filename}
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create a short hash from employee_id and timestamp
    hash_input = f"{employee_id}_{timestamp}_{original_filename}"
    short_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
    
    # Clean the original filename
    clean_name = "".join(c for c in original_filename if c.isalnum() or c in "._- ")
    
    return f"{timestamp}_{short_hash}_{clean_name}"


def save_uploaded_file(file_content: bytes, original_filename: str, employee_id: int) -> tuple[str, str]:
    """
    Save uploaded file to local storage.
    
    Args:
        file_content: Binary content of the file
        original_filename: Original filename from upload
        employee_id: ID of the employee
        
    Returns:
        tuple: (file_path, file_name) - Full path and generated filename
    """
    # Get employee's upload directory
    upload_dir = get_employee_upload_path(employee_id)
    
    # Generate unique filename
    unique_filename = generate_unique_filename(original_filename, employee_id)
    
    # Full file path
    file_path = upload_dir / unique_filename
    
    # Write file
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    return str(file_path), unique_filename


def get_file_path(file_path_str: str) -> Optional[Path]:
    """
    Get Path object for a stored file.
    
    Args:
        file_path_str: String path from database
        
    Returns:
        Path object if file exists, None otherwise
    """
    file_path = Path(file_path_str)
    
    if file_path.exists() and file_path.is_file():
        return file_path
    
    return None


def delete_file(file_path_str: str) -> bool:
    """
    Delete a file from storage.
    
    Args:
        file_path_str: String path from database
        
    Returns:
        True if deleted successfully, False otherwise
    """
    file_path = Path(file_path_str)
    
    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
        return False
    
    return False


def validate_file_format(filename: str) -> tuple[bool, str]:
    """
    Validate if file format is supported (PDF, JPG, CSV).
    
    Args:
        filename: Name of the file
        
    Returns:
        tuple: (is_valid, file_format)
    """
    allowed_extensions = {
        '.pdf': 'pdf',
        '.jpg': 'jpg',
        '.jpeg': 'jpg',
        '.csv': 'csv'
    }
    
    file_ext = Path(filename).suffix.lower()
    
    if file_ext in allowed_extensions:
        return True, allowed_extensions[file_ext]
    
    return False, ""


def get_file_size(file_path_str: str) -> Optional[int]:
    """
    Get file size in bytes.
    
    Args:
        file_path_str: String path from database
        
    Returns:
        File size in bytes, or None if file doesn't exist
    """
    file_path = Path(file_path_str)
    
    if file_path.exists() and file_path.is_file():
        return file_path.stat().st_size
    
    return None
