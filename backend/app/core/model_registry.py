"""Import every model module so Alembic sees the complete metadata graph."""

from app.modules.calendar.models import Booking, BookingConflict, BookingConflictBooking, CalendarSyncRun
from app.modules.identity.models import AppUser, AuthSession, Company, UserInvitation
from app.modules.maintenance.models import Contractor, Ticket, TicketAssignment, TicketStatusHistory, TicketSuggestion
from app.modules.messaging.models import Conversation, Message
from app.modules.properties.models import Channel, Property

__all__ = [
    "AppUser",
    "AuthSession",
    "Booking",
    "BookingConflict",
    "BookingConflictBooking",
    "CalendarSyncRun",
    "Channel",
    "Company",
    "Contractor",
    "Conversation",
    "Message",
    "Property",
    "Ticket",
    "TicketAssignment",
    "TicketStatusHistory",
    "TicketSuggestion",
    "UserInvitation",
]
