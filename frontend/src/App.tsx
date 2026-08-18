import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import {
  INITIAL_BOOKINGS, 
  INITIAL_TICKETS
} from './data/mockData';
import type { Property, Booking, Ticket } from './data/mockData';
import {
  fetchProperties,
  createProperty,
  updateProperty,
  archiveProperty,
  unarchiveProperty,
  mapApiPropertyToProperty,
  type PropertyCreatePayload,
  type PropertyUpdatePayload
} from './api/properties';
import {
  fetchConversations,
  fetchMessages,
  sendStaffMessage,
  updateHandlingMode,
  markConversationRead,
  type ApiConversation,
  type ApiMessage,
} from './api/messaging';
import { Sidebar } from './components/Sidebar';
import type { ActivePage } from './components/Sidebar';
import { useAuth } from './auth/useAuth';
import { ProtectedRoute } from './auth/ProtectedRoute';

// 9 Pages Imports
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { InboxPage } from './pages/InboxPage';
import type { ConversationFilter } from './pages/InboxPage';
import { ConversationThreadPage } from './pages/ConversationThreadPage';
import { TicketsPage } from './pages/TicketsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RegisterPage } from './pages/RegisterPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

function WorkspaceApp() {
  const { identity, logout } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Application State
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState<boolean>(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [showingArchived, setShowingArchived] = useState<boolean>(false);

  const [bookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [calendarHasConflict, setCalendarHasConflict] = useState(false);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all');
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);

  // Selection states for detail views
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');

  const isManager = identity?.user?.role === 'manager';

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProperties(true);
        setPropertiesError(null);
        const res = await fetchProperties({ include_archived: showingArchived, page_size: 100 });
        const mapped = (res.items || []).map(mapApiPropertyToProperty);
        setProperties(mapped);
        setSelectedPropertyId(prev => prev || (mapped.length > 0 ? mapped[0].id : ''));
      } catch (err: any) {
        console.error('API property request failed:', err);
        setProperties([]);
        setPropertiesError(err.message || 'Failed to load property listings from API server.');
      } finally {
        setLoadingProperties(false);
      }
    };
    void load();
  }, [showingArchived]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setConversationsError(null);
      const response = await fetchConversations(
        conversationFilter === 'unread' ? { unread: true } : conversationFilter === 'all' ? {} : { handling_mode: conversationFilter },
      );
      setConversations(response.items);
      setSelectedConversationId((current) => current || response.items[0]?.id || '');
    } catch (err: any) {
      setConversations([]);
      setConversationsError(err.message || 'Failed to load conversations from the API server.');
    } finally {
      setLoadingConversations(false);
    }
  }, [conversationFilter]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    try {
      setLoadingMessages(true);
      setMessagesError(null);
      setMessages(await fetchMessages(conversationId));
    } catch (err: any) {
      setMessages([]);
      setMessagesError(err.message || 'Failed to load this conversation history.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleToggleIncludeArchived = (include: boolean) => {
    setShowingArchived(include);
  };

  // Derived indicator counts for sidebar badges
  const unreadMessagesCount = conversations.reduce((total, conversation) => total + conversation.unread_message_count, 0);
  const openTicketsCount = tickets.filter(t => t.status === 'Open' || t.status === 'Assigned').length;
  const hasCalendarConflict = calendarHasConflict;

  // Page Handlers
  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    setActivePage('property-detail');
  };

  const handleSelectConversation = async (convId: string) => {
    setSelectedConversationId(convId);
    setActivePage('conversation-thread');
    try {
      const updated = await markConversationRead(convId);
      setConversations((current) => current.map((conversation) => conversation.id === updated.id ? updated : conversation));
    } catch (err: any) {
      setMessagesError(err.message || 'Conversation opened, but marking it read failed. Try again.');
    }
    void loadMessages(convId);
  };

  const handleToggleHandlingMode = async (mode: ApiConversation['handling_mode']) => {
    if (!selectedConversationId) return;
    try {
      setMessagesError(null);
      const updated = await updateHandlingMode(selectedConversationId, mode);
      setConversations((current) => current.map((conversation) => conversation.id === updated.id ? updated : conversation));
    } catch (err: any) {
      setMessagesError(err.message || 'Failed to update the conversation mode.');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId) return;
    try {
      setSendingMessage(true);
      setMessagesError(null);
      const created = await sendStaffMessage(selectedConversationId, content);
      setMessages((current) => [...current, created]);
      setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, handling_mode: 'manual', last_message_at: created.created_at } : conversation));
    } catch (err: any) {
      setMessagesError(err.message || 'Failed to save the manual reply.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicketStatus = (ticketId: string, newStatus: Ticket['status']) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
  };

  const handleCreateProperty = async (payload: PropertyCreatePayload) => {
    const createdApiProp = await createProperty(payload);
    const mapped = mapApiPropertyToProperty(createdApiProp);
    setProperties(prev => [mapped, ...prev]);
    setSelectedPropertyId(mapped.id);
  };

  const handleUpdateProperty = async (propertyId: string, payload: PropertyUpdatePayload) => {
    const updatedApiProp = await updateProperty(propertyId, payload);
    const mapped = mapApiPropertyToProperty(updatedApiProp);
    setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, ...mapped } : p));
  };

  const handleArchiveProperty = async (propertyId: string) => {
    const archivedApiProp = await archiveProperty(propertyId);
    const mapped = mapApiPropertyToProperty(archivedApiProp);
    setProperties(prev => prev.map(p => p.id === propertyId ? mapped : p));
    setActivePage('properties');
  };

  const handleUnarchiveProperty = async (propertyId: string) => {
    const restoredApiProp = await unarchiveProperty(propertyId);
    const mapped = mapApiPropertyToProperty(restoredApiProp);
    setProperties(prev => prev.map(p => p.id === propertyId ? mapped : p));
  };

  const handleAddTicket = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
  };

  // Selected Property Object
  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
  const propertyNames = useMemo(() => Object.fromEntries(properties.map((property) => [property.id, property.name])), [properties]);

  return (
    <div className="flex h-screen bg-[#FAF8F5] text-[#1C1B18] overflow-hidden font-sans">
      
      {/* Persistent Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={() => void logout()}
        user={identity!.user}
        company={identity!.company}
        unreadMessagesCount={unreadMessagesCount}
        openTicketsCount={openTicketsCount}
        hasCalendarConflict={hasCalendarConflict}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#FAF8F5] pb-20 md:pb-0">
        {activePage === 'dashboard' && (
          <DashboardPage
            properties={properties}
            bookings={bookings}
            tickets={tickets}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'calendar' && (
          <CalendarPage
            companyTimezone={identity!.company.timezone}
            onSelectProperty={handleSelectProperty}
            onConflictStateChange={setCalendarHasConflict}
          />
        )}

        {activePage === 'property-detail' && selectedProperty && (
          <PropertyDetailPage
            property={selectedProperty}
            bookings={bookings}
            onUpdateProperty={handleUpdateProperty}
            onArchiveProperty={handleArchiveProperty}
            onUnarchiveProperty={handleUnarchiveProperty}
            isManager={isManager}
          />
        )}

        {activePage === 'properties' && (
          <PropertiesPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onCreateProperty={handleCreateProperty}
            onToggleIncludeArchived={handleToggleIncludeArchived}
            isManager={isManager}
            loading={loadingProperties}
            error={propertiesError}
            showingArchived={showingArchived}
          />
        )}

        {activePage === 'inbox' && (
          <InboxPage
            conversations={conversations}
            loading={loadingConversations}
            error={conversationsError}
            propertyNames={propertyNames}
            onRetry={() => void loadConversations()}
            onSelectConversation={(conversationId) => void handleSelectConversation(conversationId)}
            filter={conversationFilter}
            onFilterChange={setConversationFilter}
          />
        )}

        {activePage === 'conversation-thread' && (
          <ConversationThreadPage
            conversation={selectedConversation}
            messages={messages}
            loading={loadingMessages}
            error={messagesError}
            sending={sendingMessage}
            propertyName={selectedConversation ? propertyNames[selectedConversation.property_id] : undefined}
            onBackToInbox={() => setActivePage('inbox')}
            onRetry={() => void loadMessages(selectedConversationId)}
            onToggleHandlingMode={handleToggleHandlingMode}
            onSendMessage={handleSendMessage}
          />
        )}

        {activePage === 'tickets' && (
          <TicketsPage
            tickets={tickets}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onAddTicket={handleAddTicket}
          />
        )}

        {activePage === 'settings' && identity!.user.role === 'manager' && <SettingsPage />}
      </main>

    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<WorkspaceApp />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
