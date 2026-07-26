import os
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class SmsProvider(ABC):
    @abstractmethod
    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        pass


class DevelopmentSmsProvider(SmsProvider):
    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        # Securely print to backend terminal (only in DEV mode)
        print("="*50)
        print(f"[DEV MODE] SMS SIMULATION")
        print(f"To: {phone_number}")
        print(f"OTP: {otp_code}")
        print("="*50)
        return True


class TwilioSmsProvider(SmsProvider):
    def __init__(self):
        # self.client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        # self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        pass

    async def send_otp(self, phone_number: str, otp_code: str) -> bool:
        # Twilio integration goes here
        # message = self.client.messages.create(
        #     body=f"Your MoveON verification code is: {otp_code}",
        #     from_=self.from_number,
        #     to=phone_number
        # )
        # return message.sid is not None
        
        # Fallback to dev for now if called
        print(f"[TWILIO PLACEHOLDER] Sending {otp_code} to {phone_number}")
        return True


def get_sms_provider() -> SmsProvider:
    provider = os.getenv("SMS_PROVIDER", "DEV")
    if provider == "TWILIO":
        return TwilioSmsProvider()
    return DevelopmentSmsProvider()
