import os
import json
import logging
import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)

def init_firebase_admin():
    """
    Initializes the Firebase Admin SDK.
    Requires FIREBASE_SERVICE_ACCOUNT_JSON environment variable.
    """
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json_str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    
    if not service_account_json_str:
        logger.warning("[FIREBASE] FIREBASE_SERVICE_ACCOUNT_JSON env var not set. Firebase Auth will fail.")
        return None

    try:
        service_account_info = json.loads(service_account_json_str)
        cred = credentials.Certificate(service_account_info)
        app = firebase_admin.initialize_app(cred)
        logger.info("[FIREBASE] Admin SDK initialized successfully.")
        return app
    except Exception as e:
        logger.error(f"[FIREBASE] Failed to initialize Admin SDK: {e}")
        return None

# Auto-initialize on module import
init_firebase_admin()
