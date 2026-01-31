import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Users,
  FileText,
  Settings,
  LogOut,
  Calendar,
  LayoutDashboard,
  Building2,
  Bell,
  ChevronRight,
  UserPlus,
  PlusCircle
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['manager', 'finance', 'admin'] },
    { name: 'Timesheets', href: '/timesheets', icon: Clock, roles: ['manager', 'finance', 'admin'] },
    { name: 'Employees', href: '/employees', icon: Users, roles: ['manager', 'finance', 'admin'] },
    { name: 'Clients', href: '/clients', icon: Building2, roles: ['manager', 'finance', 'admin'] },
    { name: 'Calendars', href: '/calendars', icon: Calendar, roles: ['manager', 'admin'] },
    { name: 'Configurations', href: '/configurations', icon: Settings, roles: ['admin'] },
  ];

  const quickActions = [
    { name: 'New Client', href: '/clients/onboard', icon: PlusCircle, roles: ['admin'] },
    { name: 'New Employee', href: '/employees/onboard', icon: UserPlus, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role)
  );

  const filteredQuickActions = quickActions.filter((item) =>
    item.roles.includes(user?.role)
  );

  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
    : 'U';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-800 shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">TimesheetPro</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{userInitials}</span>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-white">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-3.5rem)] border-r border-gray-200 fixed left-0 top-14 bottom-0 overflow-y-auto">
          {/* Quick Actions */}
          {filteredQuickActions.length > 0 && (
            <div className="p-4 border-b">
              <div className="space-y-2">
                {filteredQuickActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <nav className="p-3 space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Menu
            </p>
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {item.name}
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
            <div className="text-center">
              <p className="text-xs text-gray-500">TimesheetPro v1.0</p>
              <p className="text-xs text-gray-400 mt-1">Timesheet Management System</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-6 min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
