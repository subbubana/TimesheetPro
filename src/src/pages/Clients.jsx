import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientsAPI } from '../api/client';
import { Building2, Plus } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-2">Manage client accounts and billing configurations</p>
        </div>
        <Link to="/clients/onboard" className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Onboard Client
        </Link>
      </div>

      <div className="card">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No clients onboarded yet</p>
            <Link to="/clients/onboard" className="btn btn-primary">
              Onboard Your First Client
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Submission Freq</th>
                  <th>OT Multiplier</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="font-medium">{client.name}</td>
                    <td>
                      <span className="badge badge-gray">{client.code}</span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {client.contact_email || '-'}
                    </td>
                    <td className="capitalize">{client.default_submission_frequency}</td>
                    <td>{client.overtime_multiplier}x</td>
                    <td>
                      <span className={client.is_active ? 'badge-success' : 'badge-gray'}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(client.created_at).toLocaleDateString()}</td>
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

export default Clients;
