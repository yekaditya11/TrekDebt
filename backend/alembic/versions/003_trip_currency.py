"""Add trips.currency for display formatting."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_trip_currency"
down_revision: Union[str, None] = "002_expense_splits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
    )


def downgrade() -> None:
    op.drop_column("trips", "currency")
