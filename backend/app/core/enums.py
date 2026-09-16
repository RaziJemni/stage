from enum import Enum

from sqlalchemy import Enum as SAEnum


class CompanyStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class UserRole(str, Enum):
    MANAGER = "manager"
    STAFF = "staff"


class UserStatus(str, Enum):
    INVITED = "invited"
    ACTIVE = "active"
    INACTIVE = "inactive"


class PropertyStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class ChannelType(str, Enum):
    AIRBNB = "airbnb"
    BOOKING_COM = "booking_com"
    VRBO = "vrbo"
    EXPEDIA = "expedia"
    DIRECT = "direct"
    OTHER = "other"


class SyncStatus(str, Enum):
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    PARTIAL = "partial"
    FAILED = "failed"


class CalendarFeedHealthStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    HEALTHY = "healthy"
    STALE = "stale"
    PARTIAL = "partial"
    FAILED = "failed"
    INACTIVE = "inactive"


class BookingSource(str, Enum):
    AIRBNB = "airbnb"
    BOOKING_COM = "booking_com"
    VRBO = "vrbo"
    EXPEDIA = "expedia"
    DIRECT = "direct"
    MANUAL = "manual"
    OTHER = "other"


class BookingStatus(str, Enum):
    TENTATIVE = "tentative"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class BookingRecordType(str, Enum):
    RESERVATION = "reservation"
    BLOCKED_PERIOD = "blocked_period"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    DEPOSIT_RECEIVED = "deposit_received"
    PAID_IN_FULL = "paid_in_full"


class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    CHECK = "check"
    OTHER = "other"


class ConflictStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ConversationStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class HandlingMode(str, Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"


class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class SenderType(str, Enum):
    GUEST = "guest"
    CHATBOT = "chatbot"
    STAFF = "staff"
    SYSTEM = "system"


class DeliveryStatus(str, Enum):
    RECEIVED = "received"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


def enum_type(enum_class: type[Enum], name: str) -> SAEnum:
    return SAEnum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
    )
