"""Add timesheet upload tables

Revision ID: 002_timesheet_uploads
Revises: 001_initial
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_timesheet_uploads'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    op.execute("CREATE TYPE uploadsource AS ENUM ('manual', 'email', 'drive')")
    op.execute("CREATE TYPE uploadstatus AS ENUM ('pending', 'processing', 'analyzed', 'failed')")
    op.execute("CREATE TYPE integrationtype AS ENUM ('email', 'drive')")

    # Create timesheet_uploads table
    op.create_table(
        'timesheet_uploads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_format', sa.String(), nullable=False),
        sa.Column('source', sa.Enum('manual', 'email', 'drive', name='uploadsource'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'analyzed', 'failed', name='uploadstatus'), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['employees.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_timesheet_uploads_id'), 'timesheet_uploads', ['id'], unique=False)

    # Create integration_configs table
    op.create_table(
        'integration_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('email', 'drive', name='integrationtype'), nullable=False),
        sa.Column('config_data', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=False),
        sa.Column('last_sync', sa.DateTime(), nullable=True),
        sa.Column('sync_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('type')
    )
    op.create_index(op.f('ix_integration_configs_id'), 'integration_configs', ['id'], unique=False)

    # Create processed_files table
    op.create_table(
        'processed_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.Enum('manual', 'email', 'drive', name='uploadsource'), nullable=False),
        sa.Column('external_id', sa.String(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('upload_id', sa.Integer(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
        sa.ForeignKeyConstraint(['upload_id'], ['timesheet_uploads.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id')
    )
    op.create_index(op.f('ix_processed_files_id'), 'processed_files', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_processed_files_id'), table_name='processed_files')
    op.drop_table('processed_files')
    op.drop_index(op.f('ix_integration_configs_id'), table_name='integration_configs')
    op.drop_table('integration_configs')
    op.drop_index(op.f('ix_timesheet_uploads_id'), table_name='timesheet_uploads')
    op.drop_table('timesheet_uploads')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS integrationtype')
    op.execute('DROP TYPE IF EXISTS uploadstatus')
    op.execute('DROP TYPE IF EXISTS uploadsource')
