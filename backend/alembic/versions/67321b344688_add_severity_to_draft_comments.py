"""add severity to draft comments

Revision ID: 67321b344688
Revises: 1c2f6a7b9d10
Create Date: 2026-05-22 17:28:26.838003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67321b344688'
down_revision: Union[str, Sequence[str], None] = '1c2f6a7b9d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('draft_comments', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('severity', sa.String(), nullable=False, server_default='high')
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('draft_comments', schema=None) as batch_op:
        batch_op.drop_column('severity')
