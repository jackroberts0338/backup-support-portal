'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Shield, Headphones, FileText, Users, Settings, LogOut } from 'lucide-react';

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('customer')
  const [systemStatus, setSystemStatus] = useState({
    primarySystem: 'online',
    failoverActivated: false,
    lastUpdated: new Date().toISOString()
  });
  const router = useRouter();

  useEffect(() => {
    // Fetch system status
    fetchSystemStatus();
    
    if (localStorage.getItem('token')) {
      setIsLoggedIn(true);
    }
    
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
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
              {isLoggedIn ? (
                <>
                  <Link 
                    href={
                      userRole === 'admin' 
                        ? "/admin/dashboard"
                        : userRole === 'agent' 
                          ? "/agent/dashboard"
                          : "/dashboard"
                    } 
                    className="btn-primary"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-primary">
                    Login
                  </Link>
                  <Link href="/register" className="btn-secondary">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* System Status Banner */}
      {systemStatus.failoverActivated && (
        <div className="bg-backup-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                🚨 PRIMARY SUPPORT SYSTEM IS OFFLINE - YOU'RE NOW ON BACKUP SUPPORT 🚨
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Reliable Backup Support When You Need It Most
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our backup customer service portal ensures you never lose support coverage. 
            When primary systems are down, we're here to help with seamless failover support.
          </p>
          <div className="flex justify-center space-x-4">
            {isLoggedIn && (
              <Link href="/submit-ticket" className="btn-primary text-lg px-8 py-3">
                Submit Support Ticket
              </Link>
            )}
            <Link href="/tickets" className="btn-secondary text-lg px-8 py-3">
              Check Ticket Status
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Headphones className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Support</h3>
            <p className="text-gray-600">
              Round-the-clock customer service support, even when primary systems fail
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-backup-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Failover Ready</h3>
            <p className="text-gray-600">
              Instant activation when primary support systems go offline
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <FileText className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ticket Management</h3>
            <p className="text-gray-600">
              Comprehensive ticket tracking and management system
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Agents</h3>
            <p className="text-gray-600">
              Trained support agents ready to handle your requests
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Settings className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Integration</h3>
            <p className="text-gray-600">
              Seamless integration with existing support workflows
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-backup-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Alerts</h3>
            <p className="text-gray-600">
              Instant notifications when failover is activated
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">System Status</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                systemStatus.primarySystem === 'online' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {systemStatus.primarySystem === 'online' ? '🟢 Online' : '🔴 Offline'}
              </div>
              <p className="text-sm text-gray-600 mt-2">Primary System</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                systemStatus.failoverActivated 
                  ? 'bg-backup-100 text-backup-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {systemStatus.failoverActivated ? '🟡 Active' : '🟢 Standby'}
              </div>
              <p className="text-sm text-gray-600 mt-2">Backup System</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Last Updated
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {new Date(systemStatus.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Backup Support Portal. Reliable support when you need it most.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
