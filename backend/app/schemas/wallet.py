from pydantic import BaseModel
from typing import List

class WalletDepositRequest(BaseModel):
    amount: float

class WalletTransactionResponse(BaseModel):
    id: str
    amount: float
    transaction_type: str
    reference_type: str
    balance_before: float
    balance_after: float
    created_at: str

class WalletBalanceResponse(BaseModel):
    balance: float
    currency: str
    transactions: List[WalletTransactionResponse]
