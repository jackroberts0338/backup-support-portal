'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  FileText, 
  Activity, 
  Settings, 
  LogOut, 
  Plus, 
  Eye, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Mail,
  Clock,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemStatus {
  primary_system_status: string;
  failover_activated: boolean;
  last_updated: string;
}

interface Stats {
  totalUsers: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  last_login?: string;
}

interface ActivityLog {
  id: number;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

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
  assigned_agent_name?: string;
}

export default function AdminDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'tickets'>('overview');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isTogglingFailover, setIsTogglingFailover] = useState(false);
  const [isAssigningTicket, setIsAssigningTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    if (userObj.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(userObj);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchSystemStatus(),
        fetchStats(),
        fetchUsers(),
        fetchActivityLogs(),
        fetchTickets()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/activity-logs?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/tickets', {
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

  const toggleFailover = async () => {
    if (!systemStatus) return;

    setIsTogglingFailover(true);
    try {
      const newStatus = !systemStatus.failover_activated;
      const response = await fetch('/api/system/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          failover_activated: newStatus,
          primary_system_status: newStatus ? 'offline' : 'online'
        }),
      });

      if (response.ok) {
        await fetchSystemStatus();
        toast.success(`Failover ${newStatus ? 'activated' : 'deactivated'} successfully`);
        
        // Send email notification to all admins
        try {
          const notificationResponse = await fetch('/api/admin/notify-failover', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive: newStatus }),
          });
          
          if (notificationResponse.ok) {
            toast.success('Admin notifications sent');
          }
        } catch (error) {
          console.error('Failed to send admin notifications:', error);
        }
      } else {
        toast.error('Failed to toggle failover');
      }
    } catch (error) {
      toast.error('An error occurred while toggling failover');
    } finally {
      setIsTogglingFailover(false);
    }
  };

  const createUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      toast.error('All fields are required');
      return;
    }

    setIsCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast.success('User created successfully');
        setNewUser({ name: '', email: '', password: '', role: 'agent' });
        setShowCreateUser(false);
        await fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create user');
      }
    } catch (error) {
      toast.error('An error occurred while creating user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const assignTicketToAgent = async (ticketId: number, agentId: string) => {
    if (!agentId) {
      toast.error('Please select an agent');
      return;
    }

    setIsAssigningTicket(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent_id: parseInt(agentId) }),
      });

      if (response.ok) {
        toast.success('Ticket assigned successfully');
        setSelectedTicket(null);
        setSelectedAgentId('');
        await fetchTickets();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to assign ticket');
      }
    } catch (error) {
      toast.error('An error occurred while assigning ticket');
    } finally {
      setIsAssigningTicket(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'create_ticket': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'create_user': return <Users className="h-4 w-4 text-purple-600" />;
      case 'update_ticket_status': return <Settings className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
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
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
              <Shield className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ticket Management
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity Logs
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Status */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {systemStatus?.failover_activated ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      systemStatus?.failover_activated ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {systemStatus?.failover_activated ? 'FAILOVER ACTIVE' : 'SYSTEM NORMAL'}
                    </span>
                  </div>
                  <button
                    onClick={toggleFailover}
                    disabled={isTogglingFailover}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      systemStatus?.failover_activated
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } disabled:opacity-50`}
                  >
                    {isTogglingFailover ? 'Processing...' : 
                     systemStatus?.failover_activated ? 'Deactivate Failover' : 'Activate Failover'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-500">Primary System</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {systemStatus?.primary_system_status || 'Unknown'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-500">Failover Status</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {systemStatus?.failover_activated ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-500">Last Updated</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {systemStatus?.last_updated ? new Date(systemStatus.last_updated).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.totalTickets}</div>
                  <div className="text-sm text-gray-600">Total Tickets</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.openTickets}</div>
                  <div className="text-sm text-gray-600">Open Tickets</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.resolvedTickets}</div>
                  <div className="text-sm text-gray-600">Resolved Tickets</div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Manage Users</div>
                    <div className="text-sm text-gray-600">Add, edit, or remove users</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Manage Tickets</div>
                    <div className="text-sm text-gray-600">View, assign, and resolve tickets</div>
                  </div>
                </button>

                <button
                  onClick={toggleFailover}
                  disabled={isTogglingFailover}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
                >
                  <Shield className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Failover Control</div>
                    <div className="text-sm text-gray-600">Manage system status</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <button
                onClick={() => setShowCreateUser(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add User</span>
              </button>
            </div>

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="input-field"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="input-field"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="input-field"
                    />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="input-field"
                    >
                      <option value="customer">Customer</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createUser}
                      disabled={isCreatingUser}
                      className="btn-primary disabled:opacity-50"
                    >
                      {isCreatingUser ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'agent' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Ticket Management</h2>
              <button
                onClick={fetchTickets}
                className="btn-secondary"
              >
                Refresh
              </button>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.subject}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{ticket.ticket_number}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.customer_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ticket.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(ticket.status)}
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              ticket.status === 'resolved'
                                ? 'bg-green-100 text-green-800'
                                : ticket.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ticket.assigned_agent_name ? (
                            <span className="text-sm text-gray-900">
                              {ticket.assigned_agent_name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500 italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Assign</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Activity Logs</h2>
              <button
                onClick={fetchActivityLogs}
                className="btn-secondary"
              >
                Refresh
              </button>
            </div>

            <div className="card">
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getActionIcon(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {log.user_name && (
                          <span>User: {log.user_name} ({log.user_role})</span>
                        )}
                        <span>IP: {log.ip_address}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Assignment Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign Ticket #{selectedTicket.ticket_number}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Agent
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Choose an agent...</option>
                  {users
                    .filter(user => user.role === 'agent')
                    .map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setSelectedAgentId('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => assignTicketToAgent(selectedTicket.id, selectedAgentId)}
                disabled={isAssigningTicket || !selectedAgentId}
                className="btn-primary disabled:opacity-50"
              >
                {isAssigningTicket ? 'Assigning...' : 'Assign Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
