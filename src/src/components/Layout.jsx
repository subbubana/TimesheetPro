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
  Building2
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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'finance', 'admin'] },
    { name: 'Timesheets', href: '/timesheets', icon: Clock, roles: ['employee', 'manager', 'finance', 'admin'] },
    { name: 'Employees', href: '/employees', icon: Users, roles: ['manager', 'finance', 'admin'] },
    { name: 'Clients', href: '/clients', icon: Building2, roles: ['manager', 'finance', 'admin'] },
    { name: 'Calendars', href: '/calendars', icon: Calendar, roles: ['manager', 'admin'] },
    { name: 'Configurations', href: '/configurations', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex items-center">
                <Clock className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">TimesheetPro</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white min-h-[calc(100vh-4rem)] border-r">
          <nav className="mt-5 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  } group flex items-center px-3 py-2 text-sm font-medium transition-colors`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
