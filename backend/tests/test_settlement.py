from decimal import Decimal
from uuid import uuid4

from app.services.settlement import compute_balances, minimize_settlements


def test_example_settlement():
    """4 members, ₹8000 total — matches the product example."""
    ids = [uuid4() for _ in range(4)]
    names = ["Dev", "Rahul", "Ajay", "Kiran"]
    members = list(zip(ids, names))
    payments = {
        ids[0]: Decimal("4000.00"),
        ids[1]: Decimal("2000.00"),
        ids[2]: Decimal("1000.00"),
        ids[3]: Decimal("1000.00"),
    }
    per_person, balances = compute_balances(members, payments, Decimal("8000.00"))
    assert per_person == Decimal("2000.00")
    by_name = {b.member_name: b.net_balance for b in balances}
    assert by_name["Dev"] == Decimal("2000.00")
    assert by_name["Rahul"] == Decimal("0.00")
    assert by_name["Ajay"] == Decimal("-1000.00")
    assert by_name["Kiran"] == Decimal("-1000.00")

    settlements = minimize_settlements(balances)
    assert len(settlements) == 2
    total_paid_out = sum(s.amount for s in settlements)
    assert total_paid_out == Decimal("2000.00")
    assert all(s.to_member_name == "Dev" for s in settlements)
