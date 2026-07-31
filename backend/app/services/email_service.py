import os
import logging
from email.message import EmailMessage
import aiosmtplib

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)

async def send_otp_email(to_email: str, otp_code: str):
    """
    Sends a 6-digit OTP to the user via email asynchronously.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"Mocking email OTP for {to_email}. OTP is {otp_code}. (SMTP credentials not configured)")
        return

    message = EmailMessage()
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email
    message["Subject"] = "Your MoveON Authentication Code"
    
    body = f"""
    Hello,
    
    Your authentication code for MoveON is: {otp_code}
    
    This code will expire in 5 minutes. If you didn't request this code, you can safely ignore this email.
    
    Thanks,
    The MoveON Team
    """
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True if SMTP_PORT == 587 else False
        )
        logger.info(f"OTP email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
        raise
