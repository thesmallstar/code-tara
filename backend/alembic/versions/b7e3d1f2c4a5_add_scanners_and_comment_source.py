"""add_scanners_and_comment_source

Revision ID: b7e3d1f2c4a5
Revises: 67321b344688
Create Date: 2026-08-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e3d1f2c4a5'
down_revision: Union[str, Sequence[str], None] = '67321b344688'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('review_instances', schema=None) as batch_op:
        batch_op.add_column(sa.Column('scanners_json', sa.Text(), nullable=True, server_default='[]'))

    with op.batch_alter_table('draft_comments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('source', sa.String(), nullable=True, server_default='ai'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('draft_comments', schema=None) as batch_op:
        batch_op.drop_column('source')

    with op.batch_alter_table('review_instances', schema=None) as batch_op:
        batch_op.drop_column('scanners_json')
