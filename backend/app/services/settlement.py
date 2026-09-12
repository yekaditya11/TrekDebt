from decimal import Decimal
from uuid import UUID

from app.schemas.schemas import MemberBalance, SettlementTransaction


def compute_balances_from_shares(
    members: list[tuple[UUID, str]],
    payments: dict[UUID, Decimal],
    shares: dict[UUID, Decimal],
    total_expense: Decimal,
) -> tuple[Decimal, list[MemberBalance]]:
    """Balances using per-member share totals (supports unequal / partial splits)."""
    member_count = len(members)
    if member_count == 0:
        return Decimal("0.00"), []

    avg = (total_expense / member_count).quantize(Decimal("0.01")) if member_count else Decimal("0.00")
    balances: list[MemberBalance] = []

    for member_id, member_name in members:
        paid = payments.get(member_id, Decimal("0.00")).quantize(Decimal("0.01"))
        share = shares.get(member_id, Decimal("0.00")).quantize(Decimal("0.01"))
        net = (paid - share).quantize(Decimal("0.01"))
        balances.append(
            MemberBalance(
                member_id=member_id,
                member_name=member_name,
                total_paid=paid,
                share=share,
                net_balance=net,
            )
        )

    return avg, balances


def compute_balances(
    members: list[tuple[UUID, str]],
    payments: dict[UUID, Decimal],
    total_expense: Decimal,
) -> tuple[Decimal, list[MemberBalance]]:
    """Equal-split balances: share = total / n, net = paid - share."""
    member_count = len(members)
    if member_count == 0:
        return Decimal("0.00"), []

    per_person = (total_expense / member_count).quantize(Decimal("0.01"))
    allocated = per_person * member_count
    remainder = total_expense - allocated
    shares: dict[UUID, Decimal] = {}

    for index, (member_id, _) in enumerate(members):
        share = per_person
        if index == 0:
            share = (share + remainder).quantize(Decimal("0.01"))
        shares[member_id] = share

    return compute_balances_from_shares(members, payments, shares, total_expense)


def allocate_equal(amount: Decimal, member_ids: list[UUID]) -> dict[UUID, Decimal]:
    """Split amount equally across member_ids; first gets rounding remainder."""
    if not member_ids:
        return {}
    count = len(member_ids)
    base = (amount / count).quantize(Decimal("0.01"))
    parts = [base] * count
    parts[0] = (amount - base * (count - 1)).quantize(Decimal("0.01"))
    return {mid: part for mid, part in zip(member_ids, parts)}


def minimize_settlements(balances: list[MemberBalance]) -> list[SettlementTransaction]:
    """
    Greedy settlement: match largest debtors with largest creditors
    to produce the minimum number of transactions.
    """
    debtors: list[list] = []
    creditors: list[list] = []

    for balance in balances:
        net = balance.net_balance
        if net < 0:
            debtors.append([balance.member_id, balance.member_name, -net])
        elif net > 0:
            creditors.append([balance.member_id, balance.member_name, net])

    debtors.sort(key=lambda item: item[2], reverse=True)
    creditors.sort(key=lambda item: item[2], reverse=True)

    settlements: list[SettlementTransaction] = []
    i = 0
    j = 0

    while i < len(debtors) and j < len(creditors):
        amount = min(debtors[i][2], creditors[j][2]).quantize(Decimal("0.01"))
        if amount > 0:
            settlements.append(
                SettlementTransaction(
                    from_member_id=debtors[i][0],
                    from_member_name=debtors[i][1],
                    to_member_id=creditors[j][0],
                    to_member_name=creditors[j][1],
                    amount=amount,
                )
            )
        debtors[i][2] = (debtors[i][2] - amount).quantize(Decimal("0.01"))
        creditors[j][2] = (creditors[j][2] - amount).quantize(Decimal("0.01"))
        if debtors[i][2] == 0:
            i += 1
        if creditors[j][2] == 0:
            j += 1

    return settlements
