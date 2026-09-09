from decimal import Decimal
from uuid import UUID

from app.schemas.schemas import MemberBalance, SettlementTransaction


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
    balances: list[MemberBalance] = []

    # Distribute rounding remainder so shares sum exactly to total
    allocated = per_person * member_count
    remainder = total_expense - allocated

    for index, (member_id, member_name) in enumerate(members):
        share = per_person
        if index == 0:
            share = (share + remainder).quantize(Decimal("0.01"))
        paid = payments.get(member_id, Decimal("0.00")).quantize(Decimal("0.01"))
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

    return per_person, balances


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
