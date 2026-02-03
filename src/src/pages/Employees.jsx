import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesAPI, clientsAPI } from '../api/client';
import { Plus, Search, Mail, Edit2, CheckCircle, XCircle } from 'lucide-react';

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

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchTerm === '' ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClient = filterClient === '' ||
      emp.client_assignments?.some(a => a.client_id === parseInt(filterClient));

    return matchesSearch && matchesClient;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

      {/* Table View */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Clients
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(employee.role)}`}>
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {employee.client_assignments && employee.client_assignments.length > 0 ? (
                        employee.client_assignments.filter(a => a.is_active).map(a => (
                          <span key={a.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {getClientName(a.client_id)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {employee.is_active ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
                          <span className="text-sm text-green-700">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-gray-400 mr-1.5" />
                          <span className="text-sm text-gray-500">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/employees/edit/${employee.id}`}
                      className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No employees found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;
