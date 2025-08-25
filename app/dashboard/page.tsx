'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, CheckCircle, AlertCircle, LogOut, Plus, Eye, EyeOff, MessageSquare, Send, Home } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  attachment_path?: string;
}

interface TicketResponse {
  id: number;
  response: string;
  created_at: string;
  agent_name: string;
  agent_role: string;
}

export default function CustomerDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set());
  const [newResponse, setNewResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchTickets();
  }, [router]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tickets/my-tickets', {
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
    } finally {
      setIsLoading(false);
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

  const sendResponse = async (ticketId: number) => {
    if (!newResponse.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setIsResponding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets/${ticketId}/customer-respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: newResponse.trim()
        })
      });

      if (response.ok) {
        toast.success('Response sent successfully');
        setNewResponse('');
        await fetchResponses(ticketId);
        await fetchTickets(); // Refresh tickets to get updated status
      } else {
        toast.error('Failed to send response');
      }
    } catch (error) {
      toast.error('An error occurred while sending response');
    } finally {
      setIsResponding(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">My Support Tickets</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/submit-ticket')}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Ticket</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </button>
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

      {/* Welcome Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-gray-600 mt-1">
            Here's an overview of your support tickets and their current status.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't submitted any support tickets yet. Get started by creating your first ticket.
            </p>
            <button
              onClick={() => router.push('/submit-ticket')}
              className="btn-primary"
            >
              Submit Your First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Your Tickets ({tickets.length})
              </h3>
              <button
                onClick={() => router.push('/submit-ticket')}
                className="btn-primary"
              >
                New Ticket
              </button>
            </div>

            <div className="grid gap-6">
              {tickets.map((ticket) => (
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
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {ticket.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                        {ticket.attachment_path && (
                          <span className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>Has attachment</span>
                          </span>
                        )}
                      </div>

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
                            <span>View Details & Responses</span>
                          </>
                        )}
                      </button>

                      {/* Expanded Ticket Details */}
                      {expandedTickets.has(ticket.id) && (
                        <div className="border-t border-gray-200 pt-4">
                          {/* Ticket Details */}
                          <div className="mb-4">
                            <h5 className="font-medium text-gray-900 mb-3">Ticket Details:</h5>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-gray-800">{ticket.description}</p>
                            </div>
                          </div>

                          {/* Chat-like Responses */}
                          <div className="mb-4">
                            <h5 className="font-medium text-gray-900 mb-3">Conversation:</h5>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {responses.length > 0 ? (
                                responses.map((response) => (
                                  <div key={response.id} className={`flex ${response.agent_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                                      response.agent_role === 'customer' 
                                        ? 'bg-primary-500 text-white' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      <div className="text-xs opacity-75 mb-1">
                                        {response.agent_name} ({response.agent_role === 'customer' ? 'You' : response.agent_role})
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

                          {/* Customer Response Form */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h5 className="font-medium text-gray-900 mb-3">Send Response:</h5>
                            <div className="space-y-3">
                              <textarea
                                value={newResponse}
                                onChange={(e) => setNewResponse(e.target.value)}
                                placeholder="Type your response to the agent..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                rows={3}
                              />
                              <div className="flex justify-end">
                                <button
                                  onClick={() => sendResponse(ticket.id)}
                                  disabled={isResponding || !newResponse.trim()}
                                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                                >
                                  <Send className="h-4 w-4" />
                                  <span>{isResponding ? 'Sending...' : 'Send Response'}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Status Information */}
                          <div className="bg-gray-50 rounded-lg p-3 mt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Current Status:</span>
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
          </div>
        )}
      </main>
    </div>
  );
}
