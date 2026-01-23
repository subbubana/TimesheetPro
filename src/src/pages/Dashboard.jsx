import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { timesheetsAPI, employeesAPI, clientsAPI } from '../api/client';
import { Clock, CheckCircle, Users, Building2, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEmployees: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [timesheetsRes, employeesRes, clientsRes] = await Promise.all([
        timesheetsAPI.getAll({ limit: 10 }),
        employeesAPI.getAll(),
        clientsAPI.getAll()
      ]);

      const timesheetsData = timesheetsRes.data;
      setTimesheets(timesheetsData);

      const pending = timesheetsData.filter(ts => ts.status === 'submitted').length;
      const approved = timesheetsData.filter(ts => ts.status === 'approved').length;

      setStats({
        totalClients: clientsRes.data.length,
        totalEmployees: employeesRes.data.filter(emp => emp.role === 'employee').length,
        pendingTimesheets: pending,
        approvedTimesheets: approved
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-gray',
      submitted: 'badge-info',
      approved: 'badge-success',
      rejected: 'badge-danger'
    };
    return `badge ${badges[status]}`;
  };

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients, icon: Building2, color: 'text-blue-600', link: '/clients' },
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'text-purple-600', link: '/employees' },
    { label: 'Pending Approval', value: stats.pendingTimesheets, icon: Clock, color: 'text-orange-600', link: '/timesheets?status=submitted' },
    { label: 'Ready to Bill', value: stats.approvedTimesheets, icon: DollarSign, color: 'text-green-600', link: '/timesheets?status=approved' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user.first_name}! Here's your business overview.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className={`h-10 w-10 ${stat.color}`} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/clients/onboard" className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Onboard New Client</p>
                  <p className="text-sm text-gray-600">Add a client with calendar and billing settings</p>
                </div>
              </div>
            </Link>

            <Link to="/employees/onboard" className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Onboard New Employee</p>
                  <p className="text-sm text-gray-600">Add an employee and assign to a client</p>
                </div>
              </div>
            </Link>

            <Link to="/timesheets?status=submitted" className="block p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-orange-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Review Timesheets</p>
                  <p className="text-sm text-gray-600">Approve pending employee timesheets</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {stats.pendingTimesheets > 0 && (
          <div className="card bg-yellow-50 border border-yellow-200">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Action Required</h3>
                <p className="text-sm text-yellow-800 mb-4">
                  You have <strong>{stats.pendingTimesheets}</strong> timesheet{stats.pendingTimesheets !== 1 ? 's' : ''} waiting for approval.
                </p>
                <Link to="/timesheets?status=submitted" className="btn btn-primary">
                  Review Now
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Timesheets</h2>
          <Link to="/timesheets" className="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </Link>
        </div>

        {timesheets.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No timesheets collected yet</p>
            <p className="text-sm text-gray-500">
              Timesheets will appear here once employees submit them via email or drive
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Client ID</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.slice(0, 5).map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td>
                      {format(new Date(timesheet.period_start), 'MMM dd')} -{' '}
                      {format(new Date(timesheet.period_end), 'MMM dd, yyyy')}
                    </td>
                    <td>{timesheet.client_id}</td>
                    <td>{timesheet.total_hours.toFixed(1)} hrs</td>
                    <td>
                      <span className={getStatusBadge(timesheet.status)}>
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {timesheet.submission_date
                        ? format(new Date(timesheet.submission_date), 'MMM dd, yyyy')
                        : '-'}
                    </td>
                    <td>
                      <Link
                        to={`/timesheets`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
