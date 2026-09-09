from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class ExpenseCategory(str, Enum):
    FOOD = "Food"
    TRANSPORT = "Transport"
    STAY = "Stay"
    ACTIVITIES = "Activities"
    MISC = "Misc"


# --- Members ---


class MemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned


class MemberResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Trips ---


class TripCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    members: list[str] = Field(..., min_length=1, max_length=50)

    @field_validator("name")
    @classmethod
    def strip_trip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Trip name cannot be empty")
        return cleaned

    @field_validator("members")
    @classmethod
    def validate_members(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in value:
            name = raw.strip()
            if not name:
                continue
            key = name.lower()
            if key in seen:
                raise ValueError(f"Duplicate member name: {name}")
            seen.add(key)
            cleaned.append(name)
        if not cleaned:
            raise ValueError("At least one member is required")
        return cleaned


class TripJoin(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned


class TripResponse(BaseModel):
    id: UUID
    public_id: str
    name: str
    created_at: datetime
    members: list[MemberResponse]
    share_url_path: str

    model_config = {"from_attributes": True}


class TripSummary(BaseModel):
    public_id: str
    name: str
    member_count: int
    total_expense: Decimal
    per_person_share: Decimal


# --- Expenses ---


class ExpenseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    paid_by_id: UUID | None = None
    paid_by_ids: list[UUID] | None = None
    category: ExpenseCategory = ExpenseCategory.MISC
    expense_date: date
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Expense name cannot be empty")
        return cleaned

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def resolve_payers(self) -> "ExpenseCreate":
        ids: list[UUID] = list(self.paid_by_ids or [])
        if self.paid_by_id and self.paid_by_id not in ids:
            ids.insert(0, self.paid_by_id)
        # de-dupe keep order
        seen: set[UUID] = set()
        unique: list[UUID] = []
        for item in ids:
            if item not in seen:
                seen.add(item)
                unique.append(item)
        if not unique:
            raise ValueError("Pick at least one person who paid")
        self.paid_by_ids = unique
        self.paid_by_id = unique[0]
        return self


class ExpenseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    paid_by_id: UUID | None = None
    category: ExpenseCategory | None = None
    expense_date: date | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Expense name cannot be empty")
        return cleaned


class ExpenseResponse(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    paid_by_id: UUID
    paid_by_name: str
    category: str
    expense_date: date
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Balances / Settlements ---


class MemberBalance(BaseModel):
    member_id: UUID
    member_name: str
    total_paid: Decimal
    share: Decimal
    net_balance: Decimal


class SettlementTransaction(BaseModel):
    from_member_id: UUID
    from_member_name: str
    to_member_id: UUID
    to_member_name: str
    amount: Decimal


class BalanceSummary(BaseModel):
    trip_public_id: str
    trip_name: str
    member_count: int
    total_expense: Decimal
    per_person_share: Decimal
    balances: list[MemberBalance]
    settlements: list[SettlementTransaction]
