from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.models import Expense, Member, Trip
from app.schemas.schemas import (
    BalanceSummary,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    MemberCreate,
    MemberResponse,
    TripCreate,
    TripJoin,
    TripResponse,
)
from app.services.settlement import compute_balances, minimize_settlements
from app.utils.ids import generate_public_id


def _trip_response(trip: Trip) -> TripResponse:
    return TripResponse(
        id=trip.id,
        public_id=trip.public_id,
        name=trip.name,
        created_at=trip.created_at,
        members=[MemberResponse.model_validate(m) for m in trip.members],
        share_url_path=f"/trip/{trip.public_id}",
    )


def _expense_response(expense: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=expense.id,
        name=expense.name,
        amount=expense.amount,
        paid_by_id=expense.paid_by_id,
        paid_by_name=expense.paid_by.name,
        category=expense.category,
        expense_date=expense.expense_date,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )


def get_trip_by_public_id(db: Session, public_id: str) -> Trip:
    trip = db.scalar(
        select(Trip)
        .options(joinedload(Trip.members), joinedload(Trip.expenses).joinedload(Expense.paid_by))
        .where(Trip.public_id == public_id)
    )
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


def create_trip(db: Session, payload: TripCreate) -> TripResponse:
    # Retry a few times in the unlikely event of a public_id collision
    for _ in range(5):
        public_id = generate_public_id()
        exists = db.scalar(select(Trip.id).where(Trip.public_id == public_id))
        if not exists:
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate a unique trip link",
        )

    trip = Trip(public_id=public_id, name=payload.name)
    db.add(trip)
    db.flush()

    for name in payload.members:
        db.add(Member(trip_id=trip.id, name=name))

    db.commit()
    trip = get_trip_by_public_id(db, public_id)
    return _trip_response(trip)


def get_trip(db: Session, public_id: str) -> TripResponse:
    trip = get_trip_by_public_id(db, public_id)
    return _trip_response(trip)


def join_trip(db: Session, public_id: str, payload: TripJoin) -> MemberResponse:
    trip = get_trip_by_public_id(db, public_id)

    existing = next((m for m in trip.members if m.name.lower() == payload.name.lower()), None)
    if existing:
        return MemberResponse.model_validate(existing)

    member = Member(trip_id=trip.id, name=payload.name)
    db.add(member)
    db.commit()
    db.refresh(member)
    return MemberResponse.model_validate(member)


def add_member(db: Session, public_id: str, payload: MemberCreate) -> MemberResponse:
    return join_trip(db, public_id, TripJoin(name=payload.name))


def list_expenses(
    db: Session,
    public_id: str,
    category: str | None = None,
    member_id: UUID | None = None,
) -> list[ExpenseResponse]:
    trip = get_trip_by_public_id(db, public_id)

    query = (
        select(Expense)
        .options(joinedload(Expense.paid_by))
        .where(Expense.trip_id == trip.id)
        .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    )
    if category:
        query = query.where(Expense.category == category)
    if member_id:
        query = query.where(Expense.paid_by_id == member_id)

    expenses = db.scalars(query).unique().all()
    return [_expense_response(expense) for expense in expenses]


def add_expense(db: Session, public_id: str, payload: ExpenseCreate) -> list[ExpenseResponse]:
    trip = get_trip_by_public_id(db, public_id)
    payer_ids = payload.paid_by_ids or []
    trip_member_ids = {m.id for m in trip.members}

    for payer_id in payer_ids:
        if payer_id not in trip_member_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each paid_by id must belong to a member of this trip",
            )

    count = len(payer_ids)
    base = (payload.amount / count).quantize(Decimal("0.01"))
    amounts = [base] * count
    amounts[0] = (payload.amount - base * (count - 1)).quantize(Decimal("0.01"))

    created_ids: list = []
    for payer_id, amount in zip(payer_ids, amounts):
        if amount <= 0:
            continue
        expense = Expense(
            trip_id=trip.id,
            name=payload.name,
            amount=amount,
            paid_by_id=payer_id,
            category=payload.category.value,
            expense_date=payload.expense_date,
            notes=payload.notes,
        )
        db.add(expense)
        db.flush()
        created_ids.append(expense.id)

    db.commit()

    expenses = db.scalars(
        select(Expense)
        .options(joinedload(Expense.paid_by))
        .where(Expense.id.in_(created_ids))
        .order_by(Expense.created_at.asc())
    ).unique().all()
    return [_expense_response(expense) for expense in expenses]


def update_expense(
    db: Session, public_id: str, expense_id: UUID, payload: ExpenseUpdate
) -> ExpenseResponse:
    trip = get_trip_by_public_id(db, public_id)
    expense = db.scalar(
        select(Expense)
        .options(joinedload(Expense.paid_by))
        .where(Expense.id == expense_id, Expense.trip_id == trip.id)
    )
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    data = payload.model_dump(exclude_unset=True)
    if "category" in data and data["category"] is not None:
        data["category"] = data["category"].value if hasattr(data["category"], "value") else data["category"]

    if "paid_by_id" in data and data["paid_by_id"] is not None:
        member = next((m for m in trip.members if m.id == data["paid_by_id"]), None)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="paid_by_id must belong to a member of this trip",
            )

    for key, value in data.items():
        setattr(expense, key, value)

    db.commit()
    db.refresh(expense)
    expense = db.scalar(
        select(Expense).options(joinedload(Expense.paid_by)).where(Expense.id == expense.id)
    )
    return _expense_response(expense)


def delete_expense(db: Session, public_id: str, expense_id: UUID) -> None:
    trip = get_trip_by_public_id(db, public_id)
    expense = db.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.trip_id == trip.id)
    )
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    db.delete(expense)
    db.commit()


def delete_trip(db: Session, public_id: str) -> None:
    trip = get_trip_by_public_id(db, public_id)
    # Delete expenses first (paid_by FK is RESTRICT)
    for expense in list(trip.expenses):
        db.delete(expense)
    db.flush()
    db.delete(trip)
    db.commit()


def get_balances(db: Session, public_id: str) -> BalanceSummary:
    trip = get_trip_by_public_id(db, public_id)
    members = [(m.id, m.name) for m in sorted(trip.members, key=lambda m: m.created_at)]

    total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.trip_id == trip.id)
    )
    total_expense = Decimal(str(total)).quantize(Decimal("0.01"))

    paid_rows = db.execute(
        select(Expense.paid_by_id, func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.trip_id == trip.id)
        .group_by(Expense.paid_by_id)
    ).all()
    payments = {row[0]: Decimal(str(row[1])).quantize(Decimal("0.01")) for row in paid_rows}

    per_person, balances = compute_balances(members, payments, total_expense)
    settlements = minimize_settlements(balances)

    return BalanceSummary(
        trip_public_id=trip.public_id,
        trip_name=trip.name,
        member_count=len(members),
        total_expense=total_expense,
        per_person_share=per_person if members else Decimal("0.00"),
        balances=balances,
        settlements=settlements,
    )
