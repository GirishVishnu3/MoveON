from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db
from app.authentication.jwt import get_current_user
from app.models.wallet import Wallet, WalletTransaction, ReferenceType
from app.schemas.wallet import WalletDepositRequest, WalletBalanceResponse, WalletTransactionResponse
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.get("/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    wallet_service = WalletService(db)
    wallet = await wallet_service.get_or_create_wallet(current_user.id)
    
    # Fetch recent transactions
    result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(20)
    )
    transactions = result.scalars().all()
    
    tx_responses = [
        WalletTransactionResponse(
            id=str(tx.id),
            amount=tx.amount,
            transaction_type=tx.transaction_type.value,
            reference_type=tx.reference_type.value,
            balance_before=tx.balance_before,
            balance_after=tx.balance_after,
            created_at=tx.created_at.isoformat()
        ) for tx in transactions
    ]
    
    return WalletBalanceResponse(
        balance=wallet.balance,
        currency=wallet.currency,
        transactions=tx_responses
    )

@router.post("/deposit")
async def deposit_wallet(
    request: WalletDepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    wallet_service = WalletService(db)
    # Simulate an immediate successful deposit (In a real app, this goes to Stripe/Razorpay first)
    success, msg, transaction = await wallet_service.credit_wallet(
        user_id=current_user.id,
        amount=request.amount,
        reference_type=ReferenceType.DEPOSIT
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=msg)
        
    return {"message": "Deposit successful", "balance": transaction.balance_after}
