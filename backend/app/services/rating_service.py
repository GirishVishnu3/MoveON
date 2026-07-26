import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.rating import Review
from app.models.user import User

class RatingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit_review(self, booking_id: uuid.UUID, rater_id: uuid.UUID, ratee_id: uuid.UUID, rating: int, feedback_text: str = None, categories: list = None, is_anonymous: bool = False):
        if rating < 1 or rating > 5:
            return False, "Rating must be between 1 and 5"
            
        # Prevent duplicate reviews (same rater, same booking)
        existing = await self.db.execute(
            select(Review).where(Review.booking_id == booking_id, Review.rater_id == rater_id)
        )
        if existing.scalars().first():
            return False, "You have already reviewed this trip"
            
        review = Review(
            booking_id=booking_id,
            rater_id=rater_id,
            ratee_id=ratee_id,
            rating=rating,
            feedback_text=feedback_text,
            categories=categories,
            is_anonymous=is_anonymous
        )
        self.db.add(review)
        await self.db.commit()
        
        # Update user's average rating asynchronously (in a real app you might dispatch a background task)
        await self.update_user_average_rating(ratee_id)
        
        return True, "Review submitted successfully"

    async def update_user_average_rating(self, user_id: uuid.UUID):
        # Calculate new average
        result = await self.db.execute(
            select(func.avg(Review.rating).label('average')).where(Review.ratee_id == user_id)
        )
        average = result.scalar() or 0.0
        
        # We don't have a specific average_rating field on the User model yet, but if we did, we'd update it here.
        # Alternatively, we just compute it on the fly when retrieving profiles.
        # Let's assume we update a field if it exists, otherwise just log it.
        # For now, relying on DB aggregations when viewing profile is safer.
        pass
