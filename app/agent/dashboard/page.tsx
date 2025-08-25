'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, CheckCircle, AlertCircle, LogOut, MessageSquare, Send, Eye, EyeOff, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  assigned_agent_id?: number;
}

interface TicketResponse {
  id: number;
  response: string;
  created_at: string;
  agent_name: string;
  agent_role: string;
}

interface Agent {
  id: number;
  name: string;
  email: string;
}

export default function AgentDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [newResponse, setNewResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('unassigned');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    if (userObj.role !== 'agent' && userObj.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(userObj);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTickets(),
        fetchAgents()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched agents:', data.agents); // Debug log
        setAgents(data.agents);
      } else {
        console.error('Failed to fetch agents:', response.status);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchResponses = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/responses`);
      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const toggleTicketExpansion = async (ticketId: number) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
      setResponses([]);
    } else {
      newExpanded.add(ticketId);
      await fetchResponses(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const handleResponse = async (ticketId: number) => {
    if (!newResponse.trim()) {
      toast.error('Please enter a response');
      return;
    }

    // Check if the current user can respond to this ticket
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      toast.error('Ticket not found');
      return;
    }

    // Only allow response if ticket is assigned to current user or if user is admin
    if (user.role !== 'admin' && ticket.assigned_agent_id !== user.id) {
      toast.error('You can only respond to tickets assigned to you');
      return;
    }

    setIsResponding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/agent/tickets/${ticketId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: newResponse.trim(),
          status: newStatus || undefined
        })
      });

      if (response.ok) {
        toast.success('Response added successfully');
        setNewResponse('');
        setNewStatus('');
        await fetchResponses(ticketId);
        await fetchTickets(); // Refresh tickets to get updated status
      } else {
        toast.error('Failed to add response');
      }
    } catch (error) {
      toast.error('An error occurred while adding response');
    } finally {
      setIsResponding(false);
    }
  };

  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    // Check if the current user can update this ticket
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      toast.error('Ticket not found');
      return;
    }

    // Only allow status update if ticket is assigned to current user or if user is admin
    if (user.role !== 'admin' && ticket.assigned_agent_id !== user.id) {
      toast.error('You can only update tickets assigned to you');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/agent/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Ticket status updated successfully');
        fetchTickets();
      } else {
        toast.error('Failed to update ticket status');
      }
    } catch (error) {
      toast.error('An error occurred while updating ticket status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'pending': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'resolved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFilteredTickets = () => {
    if (activeTab === 'unassigned') {
      return tickets.filter(ticket => !ticket.assigned_agent_id);
    } else {
      const agentId = parseInt(activeTab);
      return tickets.filter(ticket => ticket.assigned_agent_id === agentId);
    }
  };

  const getTabTitle = (tabId: string) => {
    if (tabId === 'unassigned') {
      return 'Unassigned Tickets';
    }
    const agent = agents.find(a => a.id.toString() === tabId);
    return agent ? `${agent.name}'s Tickets` : 'Unknown';
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'unassigned') {
      return tickets.filter(ticket => !ticket.assigned_agent_id).length;
    } else {
      const agentId = parseInt(tabId);
      return tickets.filter(ticket => ticket.assigned_agent_id === agentId).length;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredTickets = getFilteredTickets();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{tickets.length}</div>
              <div className="text-sm text-gray-600">Total Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {tickets.filter(t => t.status === 'open').length}
              </div>
              <div className="text-sm text-gray-600">Open Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {tickets.filter(t => t.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tickets.filter(t => t.status === 'resolved').length}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('unassigned')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'unassigned'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Unassigned ({getTabCount('unassigned')})</span>
            </button>
            {agents.length > 0 ? (
              agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveTab(agent.id.toString())}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    activeTab === agent.id.toString()
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{agent.name} ({getTabCount(agent.id.toString())})</span>
                </button>
              ))
            ) : (
              <div className="py-4 px-1 text-sm text-gray-500 flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>No agents found. Click "Refresh Agents" to load.</span>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {getTabTitle(activeTab)}
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTickets}
              className="btn-secondary"
            >
              Refresh Tickets
            </button>
            <button
              onClick={fetchAgents}
              className="btn-secondary"
            >
              Refresh Agents
            </button>
            {/* Debug info */}
            <div className="text-sm text-gray-500">
              Total tickets: {tickets.length} | Agents: {agents.length} | Active tab: {activeTab}
            </div>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'unassigned' ? 'No unassigned tickets' : 'No tickets assigned'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'unassigned' 
                ? 'All tickets have been assigned to agents.'
                : 'No tickets are currently assigned to this agent.'
              }
            </p>
                         {agents.length === 0 && (
               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                 <h4 className="font-medium text-yellow-800 mb-2">No Agents Found</h4>
                 <p className="text-yellow-700 text-sm mb-3">
                   To see agent tabs, you need to create agent users first. 
                   Only admin users can create new agents.
                 </p>
                 <p className="text-yellow-700 text-sm mb-3">
                   Current user role: <strong>{user?.role}</strong>
                 </p>
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                   <p className="text-blue-800 text-sm font-medium mb-2">Quick Setup:</p>
                   <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                     <li>Login as admin to create agent users</li>
                     <li>Or run: <code className="bg-blue-100 px-1 rounded">npm run create-agents</code></li>
                     <li>Then refresh this page</li>
                   </ol>
                 </div>
               </div>
             )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(ticket.status)}
                      <h4 className="text-lg font-medium text-gray-900">
                        {ticket.subject}
                      </h4>
                      <span className="text-sm text-gray-500">
                        #{ticket.ticket_number}
                      </span>
                      {!ticket.assigned_agent_id && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Unassigned
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {ticket.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <span>Customer: {ticket.customer_name}</span>
                      <span>Email: {ticket.customer_email}</span>
                      <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Only show expand button if user can respond to this ticket */}
                    {(user.role === 'admin' || ticket.assigned_agent_id === user.id) && (
                      <>
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleTicketExpansion(ticket.id)}
                          className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 mb-4"
                        >
                          {expandedTickets.has(ticket.id) ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              <span>Hide Details</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              <span>View Details & Respond</span>
                            </>
                          )}
                        </button>

                        {/* Expanded Ticket Details */}
                        {expandedTickets.has(ticket.id) && (
                          <div className="border-t border-gray-200 pt-4">
                            {/* Chat-like Conversation */}
                            <div className="mb-4">
                              <h5 className="font-medium text-gray-900 mb-3">Conversation:</h5>
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {responses.length > 0 ? (
                                  responses.map((response) => (
                                    <div key={response.id} className={`flex ${response.agent_role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                                      <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                                        response.agent_role === 'customer' 
                                          ? 'bg-gray-100 text-gray-800' 
                                          : 'bg-blue-500 text-white'
                                      }`}>
                                        <div className="text-xs opacity-75 mb-1">
                                          {response.agent_name} ({response.agent_role === 'customer' ? 'Customer' : response.agent_role})
                                        </div>
                                        <p>{response.response}</p>
                                        <div className="text-xs opacity-75 mt-1 text-right">
                                          {new Date(response.created_at).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center text-gray-500 py-4">
                                    No responses yet. Start the conversation!
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Add Response Form */}
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h5 className="font-medium text-gray-900 mb-3">Add Response:</h5>
                              <div className="space-y-3">
                                <textarea
                                  value={newResponse}
                                  onChange={(e) => setNewResponse(e.target.value)}
                                  placeholder="Type your response to the customer..."
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  rows={3}
                                />

                                <div className="flex items-center space-x-4">
                                  <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  >
                                    <option value="">Keep current status</option>
                                    <option value="open">Mark as Open</option>
                                    <option value="pending">Mark as Pending</option>
                                    <option value="resolved">Mark as Resolved</option>
                                  </select>

                                  <button
                                    onClick={() => handleResponse(ticket.id)}
                                    disabled={isResponding || !newResponse.trim()}
                                    className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                                  >
                                    <Send className="h-4 w-4" />
                                    <span>{isResponding ? 'Sending...' : 'Send Response'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status Update Buttons - Only for assigned tickets */}
                        {ticket.assigned_agent_id && (
                          <div className="flex space-x-2 mt-4">
                            {ticket.status !== 'open' && (
                              <button
                                onClick={() => updateTicketStatus(ticket.id, 'open')}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                              >
                                Mark Open
                              </button>
                            )}
                            {ticket.status !== 'pending' && (
                              <button
                                onClick={() => updateTicketStatus(ticket.id, 'pending')}
                                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
                              >
                                Mark Pending
                              </button>
                            )}
                            {ticket.status !== 'resolved' && (
                              <button
                                onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                                className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : ticket.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
