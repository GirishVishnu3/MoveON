import uuid
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.wallet import Wallet, WalletTransaction, TransactionType, ReferenceType

class WalletService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_wallet(self, user_id: uuid.UUID) -> Wallet:
        result = await self.db.execute(select(Wallet).where(Wallet.user_id == user_id))
        wallet = result.scalars().first()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0.0)
            self.db.add(wallet)
            await self.db.commit()
            await self.db.refresh(wallet)
        return wallet

    async def credit_wallet(self, user_id: uuid.UUID, amount: float, reference_type: ReferenceType, reference_id: str = None) -> Tuple[bool, str, Optional[WalletTransaction]]:
        if amount <= 0:
            return False, "Amount must be positive", None

        # Lock the row for update to prevent concurrent modification issues
        result = await self.db.execute(
            select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        )
        wallet = result.scalars().first()
        if not wallet:
            wallet = await self.get_or_create_wallet(user_id)

        balance_before = wallet.balance
        wallet.balance += amount
        balance_after = wallet.balance

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=amount,
            transaction_type=TransactionType.CREDIT,
            reference_type=reference_type,
            reference_id=reference_id,
            balance_before=balance_before,
            balance_after=balance_after
        )
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)

        return True, "Success", transaction

    async def debit_wallet(self, user_id: uuid.UUID, amount: float, reference_type: ReferenceType, reference_id: str = None) -> Tuple[bool, str, Optional[WalletTransaction]]:
        if amount <= 0:
            return False, "Amount must be positive", None

        result = await self.db.execute(
            select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        )
        wallet = result.scalars().first()
        if not wallet:
            wallet = await self.get_or_create_wallet(user_id)

        if wallet.balance < amount:
            await self.db.rollback()
            return False, "Insufficient wallet balance", None

        balance_before = wallet.balance
        wallet.balance -= amount
        balance_after = wallet.balance

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=amount,
            transaction_type=TransactionType.DEBIT,
            reference_type=reference_type,
            reference_id=reference_id,
            balance_before=balance_before,
            balance_after=balance_after
        )
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)

        return True, "Success", transaction
