import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesAPI, clientsAPI } from '../api/client';
import { Users, Mail, Calendar, Plus, DollarSign, Clock, Building2, Search, Filter } from 'lucide-react';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, clientsRes] = await Promise.all([
        employeesAPI.getAll(),
        clientsAPI.getAll()
      ]);
      setEmployees(employeesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      employee: 'bg-gray-100 text-gray-700',
      manager: 'bg-blue-100 text-blue-700',
      finance: 'bg-yellow-100 text-yellow-700',
      admin: 'bg-red-100 text-red-700'
    };
    return badges[role] || 'bg-gray-100 text-gray-700';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : '';
  };

  const getClientCode = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.code : '';
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchTerm === '' ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClient = filterClient === '' ||
      emp.client_assignments?.some(a => a.client_id === parseInt(filterClient));

    return matchesSearch && matchesClient;
  });

  // Separate employees by role
  const employeeRoleUsers = filteredEmployees.filter(e => e.role === 'employee');
  const adminUsers = filteredEmployees.filter(e => e.role !== 'employee');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const EmployeeCard = ({ employee }) => {
    const initials = `${employee.first_name[0]}${employee.last_name[0]}`;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold">{initials}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {employee.email}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(employee.role)}`}>
              {employee.role}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Client Assignments */}
        {employee.client_assignments && employee.client_assignments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Assigned Clients</p>
            <div className="flex flex-wrap gap-2">
              {employee.client_assignments.filter(a => a.is_active).map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center px-2 py-1 bg-blue-50 rounded-lg text-sm"
                >
                  <Building2 className="h-3 w-3 text-blue-600 mr-1" />
                  <span className="text-blue-700 font-medium">{getClientName(assignment.client_id)}</span>
                  <span className="text-blue-500 ml-1 text-xs">({getClientCode(assignment.client_id)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600 capitalize">{employee.submission_frequency}</span>
          </div>

          {employee.pay_rate && (
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-600">${employee.pay_rate}/hr</span>
            </div>
          )}

          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-gray-400 mr-2" />
            <span className={employee.overtime_allowed ? 'text-green-600' : 'text-gray-500'}>
              {employee.overtime_allowed ? 'OT Allowed' : 'No OT'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage employee records and client assignments</p>
        </div>
        <Link to="/employees/onboard" className="btn btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Employee
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-64">
          <select
            className="input"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{employeeRoleUsers.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Admin Users</p>
              <p className="text-2xl font-bold text-gray-900">{adminUsers.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.filter(e => e.is_active).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {searchTerm || filterClient ? 'No employees match your search' : 'No employees onboarded yet'}
          </p>
          {!searchTerm && !filterClient && (
            <Link to="/employees/onboard" className="btn btn-primary">
              Onboard Your First Employee
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Regular Employees */}
          {employeeRoleUsers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Employees ({employeeRoleUsers.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeeRoleUsers.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} />
                ))}
              </div>
            </div>
          )}

          {/* Admin/Manager/Finance Users */}
          {adminUsers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Admin Users ({adminUsers.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminUsers.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Employees;
