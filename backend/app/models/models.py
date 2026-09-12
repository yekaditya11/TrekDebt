from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    public_id: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR", server_default="INR")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    members: Mapped[list["Member"]] = relationship(
        "Member", back_populates="trip", cascade="all, delete-orphan"
    )
    expenses: Mapped[list["Expense"]] = relationship(
        "Expense", back_populates="trip", cascade="all, delete-orphan"
    )


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("trip_id", "name", name="uq_member_trip_name"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    trip_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    trip: Mapped["Trip"] = relationship("Trip", back_populates="members")
    expenses_paid: Mapped[list["Expense"]] = relationship("Expense", back_populates="paid_by")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    trip_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_by_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("members.id", ondelete="RESTRICT"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="Misc")
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship("Trip", back_populates="expenses")
    paid_by: Mapped["Member"] = relationship("Member", back_populates="expenses_paid")
    splits: Mapped[list["ExpenseSplit"]] = relationship(
        "ExpenseSplit", back_populates="expense", cascade="all, delete-orphan"
    )


class ExpenseSplit(Base):
    """Members who share this expense (equal split among them)."""

    __tablename__ = "expense_splits"
    __table_args__ = (UniqueConstraint("expense_id", "member_id", name="uq_expense_split"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    expense_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True
    )

    expense: Mapped["Expense"] = relationship("Expense", back_populates="splits")
    member: Mapped["Member"] = relationship("Member")
