from datetime import datetime
class ScheduleService:
    @staticmethod
    def validate_schedule(scheduled_at: datetime) -> bool:
        if scheduled_at < datetime.utcnow():
            return False
        return True
