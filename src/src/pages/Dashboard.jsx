import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, notificationsAPI } from '../api/client';
import {
  Clock, CheckCircle, Users, Building2, DollarSign, AlertCircle,
  Bell, Calendar, ChevronDown, ChevronRight, Mail, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sendingNotification, setSendingNotification] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getData({
        year: selectedYear,
        month: selectedMonth
      });
      setDashboardData(response.data);

      // Auto-expand all clients
      const expanded = {};
      response.data.clients_with_employees.forEach(client => {
        expanded[client.client_id] = true;
      });
      setExpandedClients(expanded);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const handleNotify = async (employeeId, employeeName) => {
    setSendingNotification(prev => ({ ...prev, [employeeId]: true }));
    try {
      await notificationsAPI.send({
        employee_id: employeeId,
        notification_type: 'timesheet_reminder',
        subject: 'Timesheet Reminder',
        message: `Please submit your timesheet for ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}.`
      });
      alert(`Notification sent to ${employeeName}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification');
    } finally {
      setSendingNotification(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center" title="Approved">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        );
      case 'submitted':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center" title="Submitted - Pending Approval">
            <Clock className="h-5 w-5 text-white" />
          </div>
        );
      case 'draft':
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center" title="Draft">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center" title="Missing">
            <Calendar className="h-5 w-5 text-gray-500" />
          </div>
        );
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    totalClients: 0,
    totalEmployees: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    missingTimesheets: 0
  };

  const statCards = [
    { label: 'Total Clients', value: stats.total_clients, icon: Building2, color: 'bg-blue-500', link: '/clients' },
    { label: 'Total Employees', value: stats.total_employees, icon: Users, color: 'bg-purple-500', link: '/employees' },
    { label: 'Pending Approval', value: stats.pending_timesheets, icon: Clock, color: 'bg-orange-500', link: '/timesheets?status=submitted' },
    { label: 'Approved', value: stats.approved_timesheets, icon: CheckCircle, color: 'bg-green-500', link: '/timesheets?status=approved' },
    { label: 'Missing', value: stats.missing_timesheets, icon: AlertCircle, color: 'bg-red-500', link: '#' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.first_name}! Here's your timesheet overview.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="input py-2"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input py-2"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/clients/onboard"
          className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          <Building2 className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <p className="font-semibold text-gray-900">Add New Client</p>
            <p className="text-sm text-gray-600">Onboard a client with calendar</p>
          </div>
        </Link>

        <Link
          to="/employees/onboard"
          className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
        >
          <Users className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <p className="font-semibold text-gray-900">Add New Employee</p>
            <p className="text-sm text-gray-600">Onboard an employee</p>
          </div>
        </Link>

        <Link
          to="/timesheets?status=submitted"
          className="flex items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
        >
          <CheckCircle className="h-8 w-8 text-orange-600 mr-3" />
          <div>
            <p className="font-semibold text-gray-900">Review Timesheets</p>
            <p className="text-sm text-gray-600">{stats.pending_timesheets} pending approval</p>
          </div>
        </Link>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center space-x-6 text-sm bg-white rounded-lg p-3 border">
        <span className="font-medium text-gray-700">Status Legend:</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Approved</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-gray-600">Submitted</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600">Draft</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gray-300"></div>
          <span className="text-gray-600">Missing</span>
        </div>
      </div>

      {/* Employees Grouped by Client */}
      <div className="space-y-4">
        {dashboardData?.clients_with_employees?.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients with employees</h3>
            <p className="text-gray-500 mb-4">Start by adding a client and then onboarding employees.</p>
            <Link to="/clients/onboard" className="btn btn-primary">
              Add Your First Client
            </Link>
          </div>
        ) : (
          dashboardData?.clients_with_employees?.map((client) => (
            <div key={client.client_id} className="bg-white rounded-xl border overflow-hidden">
              {/* Client Header */}
              <button
                onClick={() => toggleClient(client.client_id)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {expandedClients[client.client_id] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{client.client_name}</h3>
                      <p className="text-sm text-gray-500">{client.client_code} | {client.submission_frequency}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {client.employees.length} employee{client.employees.length !== 1 ? 's' : ''}
                  </span>
                  {client.bill_rate && (
                    <span className="text-sm text-green-600 font-medium">
                      ${client.bill_rate}/hr
                    </span>
                  )}
                </div>
              </button>

              {/* Employee List */}
              {expandedClients[client.client_id] && (
                <div className="divide-y">
                  {client.employees.map((employee) => {
                    const hasMissing = employee.periods.some(p => p.status === 'missing');
                    return (
                      <div
                        key={employee.employee_id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">
                              {employee.employee_name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{employee.employee_name}</p>
                            <p className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.employee_email}
                            </p>
                          </div>
                        </div>

                        {/* Timesheet Period Status Icons */}
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            {employee.periods.map((period, idx) => (
                              <div key={idx} className="relative group">
                                {getStatusIcon(period.status)}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  {format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d')}
                                  <br />
                                  Status: {period.status}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Employee Info */}
                          <div className="text-right text-sm">
                            {employee.pay_rate && (
                              <p className="text-gray-600">${employee.pay_rate}/hr</p>
                            )}
                            <p className={employee.overtime_allowed ? 'text-green-600' : 'text-gray-400'}>
                              {employee.overtime_allowed ? 'OT Allowed' : 'No OT'}
                            </p>
                          </div>

                          {/* Notify Button */}
                          {hasMissing && (
                            <button
                              onClick={() => handleNotify(employee.employee_id, employee.employee_name)}
                              disabled={sendingNotification[employee.employee_id]}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                              title="Send reminder notification"
                            >
                              <Bell className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {sendingNotification[employee.employee_id] ? 'Sending...' : 'Notify'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Alert for Missing Timesheets */}
      {stats.missing_timesheets > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-900">
              {stats.missing_timesheets} Missing Timesheet{stats.missing_timesheets !== 1 ? 's' : ''}
            </h4>
            <p className="text-sm text-yellow-800 mt-1">
              Some employees haven't submitted their timesheets for {months[selectedMonth - 1].label} {selectedYear}.
              Use the Notify button to send them a reminder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
