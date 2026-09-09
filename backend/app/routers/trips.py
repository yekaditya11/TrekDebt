from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
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
from app.services import trip_service

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(payload: TripCreate, db: Session = Depends(get_db)) -> TripResponse:
    return trip_service.create_trip(db, payload)


@router.get("/{public_id}", response_model=TripResponse)
def get_trip(public_id: str, db: Session = Depends(get_db)) -> TripResponse:
    return trip_service.get_trip(db, public_id)


@router.post("/{public_id}/join", response_model=MemberResponse)
def join_trip(public_id: str, payload: TripJoin, db: Session = Depends(get_db)) -> MemberResponse:
    return trip_service.join_trip(db, public_id, payload)


@router.post(
    "/{public_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    public_id: str, payload: MemberCreate, db: Session = Depends(get_db)
) -> MemberResponse:
    return trip_service.add_member(db, public_id, payload)


@router.get("/{public_id}/expenses", response_model=list[ExpenseResponse])
def list_expenses(
    public_id: str,
    category: str | None = Query(default=None),
    member_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ExpenseResponse]:
    return trip_service.list_expenses(db, public_id, category=category, member_id=member_id)


@router.post(
    "/{public_id}/expenses",
    response_model=list[ExpenseResponse],
    status_code=status.HTTP_201_CREATED,
)
def add_expense(
    public_id: str, payload: ExpenseCreate, db: Session = Depends(get_db)
) -> list[ExpenseResponse]:
    return trip_service.add_expense(db, public_id, payload)


@router.put("/{public_id}/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    public_id: str,
    expense_id: UUID,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    return trip_service.update_expense(db, public_id, expense_id, payload)


@router.delete("/{public_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    public_id: str, expense_id: UUID, db: Session = Depends(get_db)
) -> None:
    trip_service.delete_expense(db, public_id, expense_id)


@router.delete("/{public_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(public_id: str, db: Session = Depends(get_db)) -> None:
    trip_service.delete_trip(db, public_id)


@router.get("/{public_id}/balances", response_model=BalanceSummary)
def get_balances(public_id: str, db: Session = Depends(get_db)) -> BalanceSummary:
    return trip_service.get_balances(db, public_id)
