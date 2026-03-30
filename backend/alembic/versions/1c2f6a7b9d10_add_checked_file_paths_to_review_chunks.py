"""add_checked_file_paths_to_review_chunks

Revision ID: 1c2f6a7b9d10
Revises: 9970c026bb25
Create Date: 2026-03-27 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c2f6a7b9d10'
down_revision: Union[str, Sequence[str], None] = '94eacd111d09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('review_chunks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('checked_file_paths_json', sa.Text(), nullable=True, server_default='[]'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('review_chunks', schema=None) as batch_op:
        batch_op.drop_column('checked_file_paths_json')
