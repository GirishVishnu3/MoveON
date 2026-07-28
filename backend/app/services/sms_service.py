import os
import logging
import httpx
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class SmsProvider(ABC):
    @abstractmethod
    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        pass


class DevelopmentSmsProvider(SmsProvider):
    """
    DEV mode: logs OTP to server console and returns it in the API response.
    No SMS is sent. Switch SMS_PROVIDER to 'TWILIO' or 'FAST2SMS' for production.
    """
    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        logger.info("=" * 50)
        logger.info("[DEV MODE] SMS SIMULATION - No real SMS sent")
        logger.info(f"To: {phone_number}")
        logger.info(f"OTP: {otp_code}")
        logger.info("=" * 50)
        return True


class TwilioSmsProvider(SmsProvider):
    """
    Twilio SMS provider. Requires env vars:
      - TWILIO_ACCOUNT_SID
      - TWILIO_AUTH_TOKEN
      - TWILIO_PHONE_NUMBER  (your Twilio number, e.g. +14155238886)
    """
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")

        if not all([self.account_sid, self.auth_token, self.from_number]):
            raise EnvironmentError(
                "Twilio credentials missing. Set TWILIO_ACCOUNT_SID, "
                "TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
            )

    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        payload = {
            "To": phone_number,
            "From": self.from_number,
            "Body": f"Your MoveON verification code is: {otp_code}. Valid for 5 minutes. Do not share this code.",
        }
        logger.info(f"[TWILIO] Sending OTP SMS to {phone_number[:5]}***")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                data=payload,
                auth=(self.account_sid, self.auth_token),
                timeout=10.0,
            )
        if response.status_code in (200, 201):
            data = response.json()
            logger.info(f"[TWILIO] Message queued. SID={data.get('sid')} Status={data.get('status')}")
            return True
        else:
            logger.error(f"[TWILIO] Failed: HTTP {response.status_code} — {response.text}")
            return False


class Fast2SMSProvider(SmsProvider):
    """
    Fast2SMS provider (India-specific, free tier available).
    Requires env var:
      - FAST2SMS_API_KEY  (from https://www.fast2sms.com/dashboard/apikey)
    """
    def __init__(self):
        self.api_key = os.getenv("FAST2SMS_API_KEY")
        if not self.api_key:
            raise EnvironmentError(
                "Fast2SMS API key missing. Set FAST2SMS_API_KEY environment variable."
            )

    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        # Strip country code for Fast2SMS (expects 10-digit Indian number)
        clean_number = phone_number.lstrip("+")
        if clean_number.startswith("91") and len(clean_number) == 12:
            clean_number = clean_number[2:]

        logger.info(f"[FAST2SMS] Sending OTP to {clean_number[:4]}******")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.fast2sms.com/dev/bulkV2",
                headers={"authorization": self.api_key},
                params={
                    "variables_values": otp_code,
                    "route": "otp",
                    "numbers": clean_number,
                },
                timeout=10.0,
            )
        if response.status_code == 200:
            data = response.json()
            if data.get("return") is True:
                logger.info(f"[FAST2SMS] OTP sent. Request IDs: {data.get('request_id')}")
                return True
            else:
                logger.error(f"[FAST2SMS] Provider returned error: {data}")
                return False
        else:
            logger.error(f"[FAST2SMS] HTTP {response.status_code} — {response.text}")
            return False


def get_sms_provider() -> SmsProvider:
    """
    Returns the SMS provider based on SMS_PROVIDER environment variable.
    Values:
      - 'DEV'       → DevelopmentSmsProvider (logs OTP only, no real SMS)
      - 'TWILIO'    → TwilioSmsProvider (requires TWILIO_* env vars)
      - 'FAST2SMS'  → Fast2SMSProvider (requires FAST2SMS_API_KEY env var)

    Set SMS_PROVIDER=TWILIO or SMS_PROVIDER=FAST2SMS in Railway environment
    variables to enable real SMS delivery.
    """
    provider = os.getenv("SMS_PROVIDER", "DEV").upper()
    logger.info(f"[SMS] Initializing provider: {provider}")

    if provider == "TWILIO":
        return TwilioSmsProvider()
    elif provider == "FAST2SMS":
        return Fast2SMSProvider()
    else:
        if provider != "DEV":
            logger.warning(f"[SMS] Unknown SMS_PROVIDER='{provider}', falling back to DEV mode.")
        logger.warning(
            "[SMS] DEV mode active — OTPs are logged only. "
            "Set SMS_PROVIDER=TWILIO or SMS_PROVIDER=FAST2SMS for real SMS delivery."
        )
        return DevelopmentSmsProvider()
