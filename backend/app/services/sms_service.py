"""
SMS Service — Twilio Verify integration.

Supported providers (set via SMS_PROVIDER env var):
  TWILIO_VERIFY  — Twilio Verify API (recommended for production).
                   OTP is managed entirely by Twilio; never stored locally.
                   Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID

  LOCAL          — Local fallback for backend integration tests only.
                   OTP is generated and stored in our DB.
                   OTP is logged to the server console ONLY — never returned to any API client.
                   Do NOT use in production.
"""
import os
import logging
import secrets
import httpx
from abc import ABC, abstractmethod
from enum import Enum

logger = logging.getLogger(__name__)


class OtpResult(str, Enum):
    SENT = "sent"
    APPROVED = "approved"
    PENDING = "pending"
    FAILED = "failed"
    INVALID = "invalid"
    EXPIRED = "expired"
    MAX_ATTEMPTS = "max_attempts"
    INVALID_NUMBER = "invalid_number"


class SmsProvider(ABC):
    @abstractmethod
    async def send_otp(self, phone_number: str) -> OtpResult:
        """Initiate OTP delivery. Returns OtpResult.SENT on success."""
        pass

    @abstractmethod
    async def verify_otp(self, phone_number: str, code: str) -> OtpResult:
        """Verify user-submitted code. Returns OtpResult.APPROVED on success."""
        pass

    @property
    @abstractmethod
    def manages_otp_lifecycle(self) -> bool:
        """True if the provider manages OTP storage and validation (e.g. Twilio Verify).
        False if our database stores and validates the OTP (LOCAL mode)."""
        pass


class TwilioVerifyProvider(SmsProvider):
    """
    Twilio Verify — industry-standard OTP-as-a-service.
    Twilio generates, stores, sends, and validates the OTP.
    We never see or store the OTP code.

    Required env vars:
      TWILIO_ACCOUNT_SID        — starts with AC...
      TWILIO_AUTH_TOKEN         — 32-char hex string
      TWILIO_VERIFY_SERVICE_SID — starts with VA...
                                  Create at: https://console.twilio.com/us1/verify/services
    """

    BASE_URL = "https://verify.twilio.com/v2/Services"

    def __init__(self):
        self.account_sid = os.environ["TWILIO_ACCOUNT_SID"]
        self.auth_token = os.environ["TWILIO_AUTH_TOKEN"]
        self.verify_service_sid = os.environ["TWILIO_VERIFY_SERVICE_SID"]

        if not self.account_sid.startswith("AC"):
            raise ValueError("TWILIO_ACCOUNT_SID must start with 'AC'")
        if not self.verify_service_sid.startswith("VA"):
            raise ValueError("TWILIO_VERIFY_SERVICE_SID must start with 'VA'")

        self._auth = (self.account_sid, self.auth_token)
        self._svc_url = f"{self.BASE_URL}/{self.verify_service_sid}"

    @property
    def manages_otp_lifecycle(self) -> bool:
        return True  # Twilio owns the OTP; we never see it

    async def send_otp(self, phone_number: str) -> OtpResult:
        logger.info(f"[TWILIO VERIFY] Requesting OTP for {self._mask(phone_number)}")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self._svc_url}/Verifications",
                data={"To": phone_number, "Channel": "sms"},
                auth=self._auth,
            )
        if response.status_code in (200, 201):
            status = response.json().get("status")
            logger.info(f"[TWILIO VERIFY] Verification initiated. Status={status}")
            return OtpResult.SENT
        else:
            body = response.json()
            code = body.get("code", 0)
            message = body.get("message", "Unknown error")
            logger.error(f"[TWILIO VERIFY] send_otp failed: HTTP {response.status_code} code={code} — {message}")
            # Twilio error 60200 = invalid phone number
            if code == 60200 or "not a valid phone number" in message.lower():
                return OtpResult.INVALID_NUMBER
            return OtpResult.FAILED

    async def verify_otp(self, phone_number: str, code: str) -> OtpResult:
        logger.info(f"[TWILIO VERIFY] Checking code for {self._mask(phone_number)}")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self._svc_url}/VerificationCheck",
                data={"To": phone_number, "Code": code},
                auth=self._auth,
            )
        if response.status_code in (200, 201):
            status = response.json().get("status")
            logger.info(f"[TWILIO VERIFY] VerificationCheck status={status}")
            if status == "approved":
                return OtpResult.APPROVED
            return OtpResult.INVALID
        elif response.status_code == 404:
            # 404 = no pending verification for this number
            logger.warning(f"[TWILIO VERIFY] No pending verification for {self._mask(phone_number)}")
            return OtpResult.EXPIRED
        else:
            body = response.json()
            code_err = body.get("code", 0)
            message = body.get("message", "Unknown error")
            logger.error(f"[TWILIO VERIFY] verify_otp failed: HTTP {response.status_code} code={code_err} — {message}")
            # 60202 = max check attempts reached
            if code_err == 60202:
                return OtpResult.MAX_ATTEMPTS
            return OtpResult.FAILED

    @staticmethod
    def _mask(phone: str) -> str:
        if len(phone) <= 4:
            return "***"
        return phone[:3] + "*" * (len(phone) - 7) + phone[-4:]


class LocalSmsProvider(SmsProvider):
    """
    Local fallback for backend integration tests.

    IMPORTANT:
    - OTP is stored in the database (handled by the router, not here).
    - OTP is written to the server log ONLY — never returned in any API response.
    - No SMS is sent.
    - Must NOT be used in production.
    """

    @property
    def manages_otp_lifecycle(self) -> bool:
        return False  # Our DB stores and validates the OTP

    async def send_otp(self, phone_number: str) -> OtpResult:
        # The actual OTP is generated + stored by the router, then passed here for logging.
        # We just indicate success so the router stores it.
        logger.warning(
            "[LOCAL SMS] No real SMS sent. OTP will be written to server logs only. "
            "This mode must NOT be used in production."
        )
        return OtpResult.SENT

    async def verify_otp(self, phone_number: str, code: str) -> OtpResult:
        # When manages_otp_lifecycle=False, the router handles validation against the DB.
        # This method is never called.
        raise NotImplementedError("LocalSmsProvider validation is handled by the router.")


def generate_local_otp() -> str:
    """Cryptographically secure 6-digit OTP for LOCAL mode only."""
    return str(secrets.randbelow(900000) + 100000)


def get_sms_provider() -> SmsProvider:
    """
    Returns the configured SMS provider.

    Set SMS_PROVIDER environment variable:
      TWILIO_VERIFY — production Twilio Verify (requires TWILIO_* env vars)
      LOCAL         — local testing only (no SMS sent, OTP in server logs only)

    If SMS_PROVIDER is unset or unrecognised, defaults to LOCAL with a warning.
    """
    provider_name = os.getenv("SMS_PROVIDER", "LOCAL").upper()
    logger.info(f"[SMS] Initialising provider: {provider_name}")

    if provider_name == "TWILIO_VERIFY":
        missing = [v for v in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID")
                   if not os.getenv(v)]
        if missing:
            raise EnvironmentError(
                f"SMS_PROVIDER=TWILIO_VERIFY requires these env vars: {', '.join(missing)}"
            )
        return TwilioVerifyProvider()

    if provider_name != "LOCAL":
        logger.warning(
            f"[SMS] Unknown SMS_PROVIDER='{provider_name}'. "
            "Falling back to LOCAL. Set SMS_PROVIDER=TWILIO_VERIFY for production."
        )
    logger.warning(
        "[SMS] LOCAL provider active — NO SMS will be sent. "
        "OTPs are written to server logs only. Set SMS_PROVIDER=TWILIO_VERIFY for production."
    )
    return LocalSmsProvider()
