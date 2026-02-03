import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientsAPI, employeesAPI } from '../api/client';
import { Building2, Plus, DollarSign, Calendar, Clock, Users, Search, Mail, Settings, Edit2 } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, employeesRes] = await Promise.all([
        clientsAPI.getAll(),
        employeesAPI.getAll()
      ]);
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeCount = (clientId) => {
    return employees.filter(emp =>
      emp.client_assignments?.some(a => a.client_id === clientId && a.is_active)
    ).length;
  };

  const filteredClients = clients.filter(client =>
    searchTerm === '' ||
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const ClientCard = ({ client }) => {
    const employeeCount = getEmployeeCount(client.id);

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-sm font-medium">
                  {client.code}
                </span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{employeeCount}</p>
              <p className="text-xs text-gray-500">Employees</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {client.bill_rate ? `$${client.bill_rate}` : '-'}
              </p>
              <p className="text-xs text-gray-500">Bill Rate/hr</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{client.overtime_multiplier}x</p>
              <p className="text-xs text-gray-500">OT Rate</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Frequency
              </span>
              <span className="text-gray-900 font-medium capitalize">
                {client.default_submission_frequency}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Daily OT Threshold
              </span>
              <span className="text-gray-900 font-medium">
                {client.overtime_threshold_daily} hrs
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Weekly OT Threshold
              </span>
              <span className="text-gray-900 font-medium">
                {client.overtime_threshold_weekly} hrs
              </span>
            </div>

            {client.contact_email && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </span>
                <span className="text-gray-900 truncate max-w-[150px]" title={client.contact_email}>
                  {client.contact_email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Created {new Date(client.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center space-x-2">
            <Link
              to={`/clients/edit/${client.id}`}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="Edit Client"
            >
              <Edit2 className="h-4 w-4" />
            </Link>
          </div>
          <Link
            to={`/employees?client=${client.id}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Employees
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client accounts and billing configurations</p>
        </div>
        <Link to="/clients/onboard" className="btn btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="relative">
          <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or code..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter(c => c.is_active).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.filter(e => e.role === 'employee').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Client Cards */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No clients match your search' : 'No clients onboarded yet'}
          </p>
          {!searchTerm && (
            <Link to="/clients/onboard" className="btn btn-primary">
              Onboard Your First Client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
