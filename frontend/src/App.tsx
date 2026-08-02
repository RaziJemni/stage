import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import {
  INITIAL_BOOKINGS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_TICKETS
} from './data/mockData';
import type { Property, Booking, Conversation, Ticket } from './data/mockData';
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
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);

  // Selection states for detail views
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('conv-1');

  const isManager = identity?.user?.role === 'manager';

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProperties(true);
        setPropertiesError(null);
        const res = await fetchProperties({ include_archived: showingArchived });
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

  const handleToggleIncludeArchived = (include: boolean) => {
    setShowingArchived(include);
  };

  // Derived indicator counts for sidebar badges
  const unreadMessagesCount = conversations.filter(c => c.unread).length;
  const openTicketsCount = tickets.filter(t => t.status === 'Open' || t.status === 'Assigned').length;
  const hasCalendarConflict = bookings.some(b => b.status === 'Conflict');

  // Page Handlers
  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    setActivePage('property-detail');
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConversationId(convId);
    setActivePage('conversation-thread');
  };

  const handleToggleAIMode = (convId: string, currentMode: boolean) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          aiMode: !currentMode,
          status: !currentMode ? 'ai_handled' : 'staff_took_over'
        };
      }
      return c;
    }));
  };

  const handleSendMessage = (convId: string, text: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        const newMsg = {
          id: `msg-${Date.now()}`,
          sender: 'staff' as const,
          senderName: `${identity?.user?.name || 'Staff'}`,
          text: text,
          timestamp: 'Just now'
        };
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: 'Just now',
          unread: false,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    }));
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
  // Selected Conversation Object
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || conversations[0];

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
            properties={properties}
            bookings={bookings}
            onSelectProperty={handleSelectProperty}
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
            onSelectConversation={handleSelectConversation}
          />
        )}

        {activePage === 'conversation-thread' && (
          <ConversationThreadPage
            conversation={selectedConversation}
            onBackToInbox={() => setActivePage('inbox')}
            onToggleAIMode={handleToggleAIMode}
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
