import { useState } from 'react';
import { 
  INITIAL_PROPERTIES, 
  INITIAL_BOOKINGS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_TICKETS, 
  INITIAL_TEAM
} from './data/mockData';
import type { Property, Booking, Conversation, Ticket } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import type { ActivePage } from './components/Sidebar';

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

export function App() {
  // Navigation & Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Application Mock State
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [bookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [team] = useState(INITIAL_TEAM);

  // Selection states for detail views
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('prop-1'); // Villa Yasmine default
  const [selectedConversationId, setSelectedConversationId] = useState<string>('conv-1');

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
          senderName: 'Youssef Ben Salem (Staff)',
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

  const handleAddProperty = (newProp: Property) => {
    setProperties(prev => [newProp, ...prev]);
  };

  const handleAddTicket = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
  };

  // Render Login page if not authenticated or if login page selected
  if (!isAuthenticated || activePage === 'login') {
    return (
      <LoginPage 
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setActivePage('dashboard');
        }} 
      />
    );
  }

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
        onLogout={() => setIsAuthenticated(false)}
        unreadMessagesCount={unreadMessagesCount}
        openTicketsCount={openTicketsCount}
        hasCalendarConflict={hasCalendarConflict}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#FAF8F5]">
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

        {activePage === 'property-detail' && (
          <PropertyDetailPage
            property={selectedProperty}
            bookings={bookings}
          />
        )}

        {activePage === 'properties' && (
          <PropertiesPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddProperty={handleAddProperty}
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

        {activePage === 'settings' && (
          <SettingsPage
            team={team}
          />
        )}
      </main>

    </div>
  );
}

export default App;
