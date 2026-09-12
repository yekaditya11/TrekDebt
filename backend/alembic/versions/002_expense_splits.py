"""Add expense_splits for per-expense member sharing."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_expense_splits"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "expense_splits",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expense_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["expenses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expense_id", "member_id", name="uq_expense_split"),
    )
    op.create_index("ix_expense_splits_expense_id", "expense_splits", ["expense_id"])
    op.create_index("ix_expense_splits_member_id", "expense_splits", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_expense_splits_member_id", table_name="expense_splits")
    op.drop_index("ix_expense_splits_expense_id", table_name="expense_splits")
    op.drop_table("expense_splits")
