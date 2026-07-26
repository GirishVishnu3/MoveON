from app.models.booking import Coupon, CouponType
from typing import Tuple, Optional

class CouponService:
    @staticmethod
    def validate_coupon(coupon: Optional[Coupon], fare_amount: float) -> Tuple[bool, float, str]:
        if not coupon:
            return False, 0.0, "Invalid coupon code"
            
        if coupon.min_fare > fare_amount:
            return False, 0.0, f"Minimum fare requirement not met (min: {coupon.min_fare})"
            
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return False, 0.0, "Coupon usage limit reached"
            
        discount = 0.0
        if coupon.coupon_type == CouponType.FIXED:
            discount = coupon.value
        elif coupon.coupon_type == CouponType.PERCENTAGE:
            discount = fare_amount * (coupon.value / 100.0)
            if coupon.max_discount:
                discount = min(discount, coupon.max_discount)
                
        return True, discount, "Coupon applied successfully"
