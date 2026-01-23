import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesAPI, clientsAPI } from '../api/client';
import { Users, Mail, Calendar, Plus } from 'lucide-react';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

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
      employee: 'badge-gray',
      manager: 'badge-info',
      finance: 'badge-warning',
      admin: 'badge-danger'
    };
    return `badge ${badges[role]}`;
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-2">Manage employee records and client assignments</p>
        </div>
        <Link to="/employees/onboard" className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Onboard Employee
        </Link>
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No employees onboarded yet</p>
            <Link to="/employees/onboard" className="btn btn-primary">
              Onboard Your First Employee
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Client</th>
                  <th>Role</th>
                  <th>Submission Frequency</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        {employee.email}
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {getClientName(employee.client_id)}
                    </td>
                    <td>
                      <span className={getRoleBadge(employee.role)}>
                        {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {employee.submission_frequency.charAt(0).toUpperCase() +
                         employee.submission_frequency.slice(1)}
                      </div>
                    </td>
                    <td>
                      <span className={employee.is_active ? 'badge-success' : 'badge-gray'}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-sm">
                      {new Date(employee.created_at).toLocaleDateString()}
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

export default Employees;
