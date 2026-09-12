from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.models import Expense, ExpenseSplit, Member, Trip
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
    TripUpdate,
)
from app.services.settlement import (
    allocate_equal,
    compute_balances_from_shares,
    minimize_settlements,
)
from app.utils.ids import generate_public_id


def _trip_response(trip: Trip) -> TripResponse:
    return TripResponse(
        id=trip.id,
        public_id=trip.public_id,
        name=trip.name,
        currency=getattr(trip, "currency", None) or "INR",
        created_at=trip.created_at,
        members=[MemberResponse.model_validate(m) for m in trip.members],
        share_url_path=f"/trip/{trip.public_id}",
    )


def _split_ids_and_names(expense: Expense, trip: Trip) -> tuple[list[UUID], list[str]]:
    if expense.splits:
        member_by_id = {m.id: m for m in trip.members}
        ids: list[UUID] = []
        names: list[str] = []
        for split in expense.splits:
            ids.append(split.member_id)
            member = member_by_id.get(split.member_id) or split.member
            names.append(member.name if member else str(split.member_id))
        return ids, names
    # No rows = shared by everyone
    members = sorted(trip.members, key=lambda m: m.created_at)
    return [m.id for m in members], [m.name for m in members]


def _expense_response(expense: Expense, trip: Trip) -> ExpenseResponse:
    split_ids, split_names = _split_ids_and_names(expense, trip)
    return ExpenseResponse(
        id=expense.id,
        name=expense.name,
        amount=expense.amount,
        paid_by_id=expense.paid_by_id,
        paid_by_name=expense.paid_by.name,
        split_member_ids=split_ids,
        split_member_names=split_names,
        category=expense.category,
        expense_date=expense.expense_date,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )


def _expense_load_options():
    return (
        joinedload(Expense.paid_by),
        joinedload(Expense.splits).joinedload(ExpenseSplit.member),
    )


def get_trip_by_public_id(db: Session, public_id: str) -> Trip:
    trip = db.scalar(
        select(Trip)
        .options(
            joinedload(Trip.members),
            joinedload(Trip.expenses).joinedload(Expense.paid_by),
            joinedload(Trip.expenses).joinedload(Expense.splits).joinedload(ExpenseSplit.member),
        )
        .where(Trip.public_id == public_id)
    )
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


def _validate_member_ids(trip: Trip, member_ids: list[UUID], label: str) -> list[UUID]:
    trip_member_ids = {m.id for m in trip.members}
    seen: set[UUID] = set()
    unique: list[UUID] = []
    for mid in member_ids:
        if mid not in trip_member_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Each {label} id must belong to a member of this trip",
            )
        if mid not in seen:
            seen.add(mid)
            unique.append(mid)
    if not unique:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pick at least one member for {label}",
        )
    return unique


def _set_splits(db: Session, expense: Expense, split_ids: list[UUID]) -> None:
    for split in list(expense.splits):
        db.delete(split)
    db.flush()
    for mid in split_ids:
        db.add(ExpenseSplit(expense_id=expense.id, member_id=mid))


def create_trip(db: Session, payload: TripCreate) -> TripResponse:
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

    trip = Trip(
        public_id=public_id,
        name=payload.name,
        currency=payload.currency.value,
    )
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


def update_trip(db: Session, public_id: str, payload: TripUpdate) -> TripResponse:
    trip = get_trip_by_public_id(db, public_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        trip.name = data["name"]
    if "currency" in data and data["currency"] is not None:
        currency = data["currency"]
        trip.currency = currency.value if hasattr(currency, "value") else currency
    db.commit()
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
        .options(*_expense_load_options())
        .where(Expense.trip_id == trip.id)
        .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    )
    if category:
        query = query.where(Expense.category == category)
    if member_id:
        query = query.where(Expense.paid_by_id == member_id)

    expenses = db.scalars(query).unique().all()
    return [_expense_response(expense, trip) for expense in expenses]


def add_expense(db: Session, public_id: str, payload: ExpenseCreate) -> list[ExpenseResponse]:
    trip = get_trip_by_public_id(db, public_id)
    payer_ids = _validate_member_ids(trip, list(payload.paid_by_ids or []), "paid_by")

    if payload.split_member_ids:
        split_ids = _validate_member_ids(trip, list(payload.split_member_ids), "split")
    else:
        split_ids = [m.id for m in sorted(trip.members, key=lambda m: m.created_at)]

    count = len(payer_ids)
    base = (payload.amount / count).quantize(Decimal("0.01"))
    amounts = [base] * count
    amounts[0] = (payload.amount - base * (count - 1)).quantize(Decimal("0.01"))

    created_ids: list[UUID] = []
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
        for mid in split_ids:
            db.add(ExpenseSplit(expense_id=expense.id, member_id=mid))
        created_ids.append(expense.id)

    db.commit()

    expenses = db.scalars(
        select(Expense)
        .options(*_expense_load_options())
        .where(Expense.id.in_(created_ids))
        .order_by(Expense.created_at.asc())
    ).unique().all()
    trip = get_trip_by_public_id(db, public_id)
    return [_expense_response(expense, trip) for expense in expenses]


def update_expense(
    db: Session, public_id: str, expense_id: UUID, payload: ExpenseUpdate
) -> ExpenseResponse:
    trip = get_trip_by_public_id(db, public_id)
    expense = db.scalar(
        select(Expense)
        .options(*_expense_load_options())
        .where(Expense.id == expense_id, Expense.trip_id == trip.id)
    )
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    data = payload.model_dump(exclude_unset=True)
    split_member_ids = data.pop("split_member_ids", None)

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

    if split_member_ids is not None:
        validated = _validate_member_ids(trip, list(split_member_ids), "split")
        _set_splits(db, expense, validated)

    db.commit()
    expense = db.scalar(
        select(Expense).options(*_expense_load_options()).where(Expense.id == expense.id)
    )
    trip = get_trip_by_public_id(db, public_id)
    return _expense_response(expense, trip)


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
    for expense in list(trip.expenses):
        db.delete(expense)
    db.flush()
    db.delete(trip)
    db.commit()


def get_balances(db: Session, public_id: str) -> BalanceSummary:
    trip = get_trip_by_public_id(db, public_id)
    members = [(m.id, m.name) for m in sorted(trip.members, key=lambda m: m.created_at)]
    member_ids = [m[0] for m in members]

    payments: dict[UUID, Decimal] = {mid: Decimal("0.00") for mid in member_ids}
    shares: dict[UUID, Decimal] = {mid: Decimal("0.00") for mid in member_ids}
    total_expense = Decimal("0.00")

    for expense in trip.expenses:
        amount = Decimal(str(expense.amount)).quantize(Decimal("0.01"))
        total_expense += amount
        if expense.paid_by_id in payments:
            payments[expense.paid_by_id] += amount

        if expense.splits:
            split_ids = [s.member_id for s in expense.splits]
        else:
            split_ids = list(member_ids)

        # Keep only current trip members
        split_ids = [mid for mid in split_ids if mid in shares]
        if not split_ids:
            split_ids = list(member_ids)

        for mid, part in allocate_equal(amount, split_ids).items():
            shares[mid] = (shares[mid] + part).quantize(Decimal("0.01"))

    total_expense = total_expense.quantize(Decimal("0.01"))
    per_person, balances = compute_balances_from_shares(members, payments, shares, total_expense)
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
