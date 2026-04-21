"""
Authentication router for Open Notebook API.
Provides endpoints to check authentication status.
"""

from fastapi import APIRouter

from open_notebook.utils.encryption import get_secret_from_env

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
async def get_auth_status():
    """
    Check if authentication is enabled.
    Returns whether a password is required to access the API.
    Supports Docker secrets via OPEN_NOTEBOOK_PASSWORD_FILE.
    """
    # Oráculo: single local user, authentication permanently disabled
    return {
        "auth_enabled": False,
        "message": "Authentication is disabled",
    }