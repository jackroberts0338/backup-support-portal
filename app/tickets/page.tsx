'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search, ArrowRight, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketsPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketNumber || !email) {
      toast.error('Please enter both ticket number and email');
      return;
    }

    setIsLoading(true);
    setTicket(null);

    try {
      const response = await fetch('/api/tickets/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketNumber,
          email
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        toast.success('Ticket found!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Ticket not found');
      }
    } catch (error) {
      toast.error('An error occurred while searching for the ticket');
    } finally {
      setIsLoading(false);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-backup-600" />
              <h1 className="text-2xl font-bold text-gray-900">Backup Support Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/" className="btn-secondary">
                Back to Home
              </a>
              <a href="/submit-ticket" className="btn-primary">
                Submit Ticket
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <FileText className="h-20 w-20 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Check Ticket Status
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enter your ticket number and email address to check the current status of your support request.
          </p>
        </div>

        {/* Search Form */}
        <div className="card max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label htmlFor="ticketNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Number *
              </label>
              <input
                type="text"
                id="ticketNumber"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                className="input-field"
                placeholder="e.g., TKT-1234567890-ABC12"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter the email you used when submitting the ticket"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-lg font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Search Ticket</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Ticket Results */}
        {ticket && (
          <div className="card max-w-4xl mx-auto">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ticket #{ticket.ticket_number}
              </h2>
              <p className="text-gray-600">{ticket.subject}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Priority</h3>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
                <p className="text-gray-900">{new Date(ticket.created_at).toLocaleString()}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                <p className="text-gray-900">{new Date(ticket.updated_at || ticket.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>

            {ticket.attachment_path && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Attachment</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">File attached to this ticket</span>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Need to submit a new ticket?
                </p>
                <a
                  href="/submit-ticket"
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Submit New Ticket</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 card bg-blue-50 border-blue-200 max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <FileText className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Can't find your ticket?
              </h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Check that you've entered the correct ticket number</li>
                <li>• Ensure the email address matches the one used when submitting</li>
                <li>• Ticket numbers are case-sensitive</li>
                <li>• If you're still having trouble, submit a new ticket</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
