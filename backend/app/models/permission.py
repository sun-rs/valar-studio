"""Permission model for account access control."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class AccountPermission(Base):
    """Model for user-account permission mapping."""

    __tablename__ = "account_permissions"
    __table_args__ = (
        UniqueConstraint('user_id', 'account_id', name='_user_account_uc'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(100), nullable=False, index=True)
    permission_type = Column(String(20), default="view")  # view, trade, manage
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="permissions")
    creator = relationship("User", foreign_keys=[created_by])