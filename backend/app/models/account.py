"""Account configuration model."""
from sqlalchemy import Column, String, Float, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, backref
from ..core.database import Base


class AccountConfig(Base):
    """Configuration for trading accounts."""

    __tablename__ = "account_config"

    account_id = Column(String(100), primary_key=True)
    account_name = Column(String(200), nullable=True)
    initial_capital = Column(Float, default=0.0)
    currency = Column(String(10), default="CNY")
    broker = Column(String(50), nullable=True)
    description = Column(String(500), nullable=True)
    tags = Column(JSON, default=list)
    config = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationship
    creator = relationship(
        "User",
        backref=backref("account_configs", passive_deletes=True),
        foreign_keys=[created_by],
        passive_deletes=True,
    )

