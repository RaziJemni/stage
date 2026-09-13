import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import type { Property } from './data/mockData';
import { assignContractor, confirmTicketSuggestion, createContractor, createTicket, fetchAllTickets, fetchContractors, fetchTickets, fetchTicketStatusHistory, fetchTicketSuggestions, rejectTicketSuggestion, sendTicketGuestUpdate, updateContractor, updateTicketStatus, type ApiContractor, type ApiTicket, type ApiTicketStatusHistory, type ApiTicketSuggestion, type TicketFilters, type TicketPriority, type TicketStatus } from './api/maintenance';
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
  fetchConversationCount,
  fetchMessages,
  fetchUnreadConversationCount,
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
import { fetchBookingConflicts } from './api/calendar';
import { useVisiblePolling } from './hooks/useVisiblePolling';

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
import { I18nProvider } from './i18n/I18nContext';

function WorkspaceApp() {
  const { identity, logout } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Application State
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState<boolean>(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [showingArchived, setShowingArchived] = useState<boolean>(false);
  const [calendarHasConflict, setCalendarHasConflict] = useState(false);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all');
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [persistentTickets, setPersistentTickets] = useState<ApiTicket[]>([]);
  const [ticketSuggestions, setTicketSuggestions] = useState<ApiTicketSuggestion[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [contractors, setContractors] = useState<ApiContractor[]>([]);
  const [ticketFilters, setTicketFilters] = useState<TicketFilters>({});
  const [ticketStatusHistories, setTicketStatusHistories] = useState<Record<string, ApiTicketStatusHistory[]>>({});
  const [openTicketsCount, setOpenTicketsCount] = useState(0);

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

  const loadTickets = useCallback(async (background = false) => {
    if (!background) {
      setLoadingTickets(true);
      setTicketsError(null);
    }
    try {
      const ticketPage = await fetchTickets(ticketFilters);
      setPersistentTickets(ticketPage?.items || []);
      if (!background) {
        const [suggestionPage, contractorPage] = await Promise.all([
          fetchTicketSuggestions(),
          fetchContractors(true),
        ]);
        setTicketSuggestions(suggestionPage?.items || []);
        setContractors(contractorPage?.items || []);
      }
    } catch (err: any) {
      if (background) console.error('Unable to refresh maintenance badge:', err);
      else setTicketsError(err.message || 'Failed to load maintenance work.');
    } finally {
      if (!background) setLoadingTickets(false);
    }
  }, [ticketFilters]);
  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const loadOpenTicketsCount = useCallback(async () => {
    try {
      const tickets = await fetchAllTickets();
      setOpenTicketsCount(tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'assigned').length);
    } catch (err) {
      // Preserve the last known badge rather than imply there is no maintenance work.
      console.error('Unable to refresh maintenance badge:', err);
    }
  }, []);

  useEffect(() => { void loadOpenTicketsCount(); }, [loadOpenTicketsCount]);


  const loadConversations = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoadingConversations(true);
        setConversationsError(null);
      }
      const response = await fetchConversations(
        conversationFilter === 'unread' ? { unread: true } : conversationFilter === 'all' ? {} : { handling_mode: conversationFilter },
      );
      setConversations(response.items);
      setSelectedConversationId((current) => current || response.items[0]?.id || '');
    } catch (err: any) {
      if (background) console.error('Unable to refresh conversations:', err);
      else {
        setConversations([]);
        setConversationsError(err.message || 'Failed to load conversations from the API server.');
      }
    } finally {
      if (!background) setLoadingConversations(false);
    }
  }, [conversationFilter]);

  const loadMessages = useCallback(async (conversationId: string, background = false) => {
    if (!conversationId) return;
    try {
      if (!background) {
        setLoadingMessages(true);
        setMessagesError(null);
      }
      setMessages(await fetchMessages(conversationId));
    } catch (err: any) {
      if (background) console.error('Unable to refresh conversation history:', err);
      else {
        setMessages([]);
        setMessagesError(err.message || 'Failed to load this conversation history.');
      }
    } finally {
      if (!background) setLoadingMessages(false);
    }
  }, []);

  const loadUnreadMessagesCount = useCallback(async () => {
    try {
      setUnreadMessagesCount(await fetchUnreadConversationCount());
    } catch (err) {
      console.error('Unable to refresh unread conversation count:', err);
    }
  }, []);

  const loadConversationCount = useCallback(async () => {
    try {
      setConversationCount(await fetchConversationCount());
    } catch (err) {
      console.error('Unable to refresh conversation count:', err);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    void loadUnreadMessagesCount();
    void loadConversationCount();
  }, [loadConversationCount, loadConversations, loadUnreadMessagesCount]);

  const refreshCalendarConflict = useCallback(async () => {
    try {
      const conflicts = await fetchBookingConflicts();
      setCalendarHasConflict(conflicts.some((conflict) => conflict.status === 'open' || conflict.status === 'acknowledged'));
    } catch (err) {
      // Preserve the last known badge rather than imply there are no conflicts.
      console.error('Unable to refresh calendar conflict badge:', err);
    }
  }, []);

  const refreshOperationalState = useCallback(async () => {
    const refreshes: Array<Promise<void>> = [
      loadUnreadMessagesCount(),
      loadOpenTicketsCount(),
    ];
    if (activePage !== 'dashboard') refreshes.push(refreshCalendarConflict());
    if (activePage === 'inbox') {
      refreshes.push(loadConversationCount(), loadConversations(true));
    }
    if (activePage === 'tickets') refreshes.push(loadTickets(true));
    if (activePage === 'conversation-thread' && selectedConversationId) {
      refreshes.push(loadMessages(selectedConversationId, true));
    }
    await Promise.all(refreshes);
  }, [activePage, loadConversationCount, loadConversations, loadMessages, loadOpenTicketsCount, loadTickets, loadUnreadMessagesCount, refreshCalendarConflict, selectedConversationId]);

  useVisiblePolling(refreshOperationalState, 10_000);

  const handleToggleIncludeArchived = (include: boolean) => {
    setShowingArchived(include);
  };

  // Sidebar badges represent company-wide state, not the active inbox page or filter.
  const hasCalendarConflict = calendarHasConflict;

  // Page Handlers
  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    setActivePage('property-detail');
  };

  const handleSelectConversation = async (convId: string) => {
    setSelectedConversationId(convId);
    setActivePage('conversation-thread');
    setMarkReadError(null);
    try {
      const updated = await markConversationRead(convId);
      setConversations((current) => current.map((conversation) => conversation.id === updated.id ? updated : conversation));
      await loadUnreadMessagesCount();
    } catch (err: any) {
      setMarkReadError(err.message || 'Conversation opened, but marking it read failed. Try again.');
    }
    await loadMessages(convId);
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

  const handleCreateTicket = async (input: { property_id: string; title: string; description: string; priority: TicketPriority }) => { const ticket = await createTicket(input); setPersistentTickets((current) => [ticket, ...current]); };
  const handleConfirmSuggestion = async (suggestion: ApiTicketSuggestion) => { await confirmTicketSuggestion(suggestion); await loadTickets(); };
  const handleRejectSuggestion = async (suggestionId: string) => { await rejectTicketSuggestion(suggestionId); setTicketSuggestions((current) => current.filter((suggestion) => suggestion.id !== suggestionId)); };
  const handleCreateContractor = async (input: { name: string; phone?: string; specialty?: string; notes?: string }) => { const contractor = await createContractor(input); setContractors((current) => [...current, contractor].sort((left, right) => left.name.localeCompare(right.name))); };
  const handleUpdateContractor = async (contractorId: string, input: { name: string; phone?: string; specialty?: string; notes?: string }) => { const contractor = await updateContractor(contractorId, input); setContractors((current) => current.map((item) => item.id === contractor.id ? contractor : item)); };
  const handleDeactivateContractor = async (contractorId: string) => { const contractor = await updateContractor(contractorId, { is_active: false }); setContractors((current) => current.map((item) => item.id === contractor.id ? contractor : item)); };
  const handleAssignContractor = async (ticketId: string, contractorId: string) => { await assignContractor(ticketId, contractorId); await loadTickets(); };
  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus, note?: string) => { await updateTicketStatus(ticketId, status, note); const history = await fetchTicketStatusHistory(ticketId); setTicketStatusHistories((current) => ({ ...current, [ticketId]: history })); await loadTickets(); };
  const handleLoadTicketStatusHistory = async (ticketId: string) => { const history = await fetchTicketStatusHistory(ticketId); setTicketStatusHistories((current) => ({ ...current, [ticketId]: history })); };
  const handleSendTicketGuestUpdate = async (ticketId: string, content: string) => {
    await sendTicketGuestUpdate(ticketId, content);
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
            companyTimezone={identity!.company.timezone}
            onNavigate={setActivePage}
            onConflictStateChange={setCalendarHasConflict}
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
            totalConversations={conversationCount}
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
            error={messagesError ?? markReadError}
            sending={sendingMessage}
            propertyName={selectedConversation ? propertyNames[selectedConversation.property_id] : undefined}
            onBackToInbox={() => {
              setActivePage('inbox');
              void loadConversations();
            }}
            onRetry={() => void (markReadError ? handleSelectConversation(selectedConversationId) : loadMessages(selectedConversationId))}
            onToggleHandlingMode={handleToggleHandlingMode}
            onSendMessage={handleSendMessage}
          />
        )}

        {activePage === 'tickets' && (
          <TicketsPage
            tickets={persistentTickets} suggestions={ticketSuggestions} properties={properties}
            loading={loadingTickets} error={ticketsError} onRetry={() => void loadTickets()}
            onCreate={handleCreateTicket} onConfirm={handleConfirmSuggestion} onReject={handleRejectSuggestion}
            contractors={contractors} onCreateContractor={handleCreateContractor}
            onUpdateContractor={handleUpdateContractor}
            onDeactivateContractor={handleDeactivateContractor} onAssignContractor={handleAssignContractor}
            filters={ticketFilters} onFiltersChange={setTicketFilters}
            statusHistories={ticketStatusHistories} onLoadStatusHistory={handleLoadTicketStatusHistory}
            onUpdateStatus={handleUpdateTicketStatus}
            onSendGuestUpdate={handleSendTicketGuestUpdate}
          />
        )}

        {activePage === 'settings' && identity!.user.role === 'manager' && <SettingsPage />}
      </main>

    </div>
  );
}

export function App() {
  const { identity, updatePreferences } = useAuth();

  const handleLocaleChange = useCallback(async (newLocale: 'fr' | 'en') => {
    if (identity) {
      await updatePreferences({ preferred_language: newLocale });
    }
  }, [identity, updatePreferences]);

  return (
    <I18nProvider
      userPreferredLanguage={identity?.user?.preferred_language}
      onLocaleChange={handleLocaleChange}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<WorkspaceApp />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </I18nProvider>
  );
}

export default App;
