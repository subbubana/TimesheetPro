import { useEffect, useState } from 'react';
import { configurationsAPI } from '../api/client';
import { Settings, Plus, AlertCircle } from 'lucide-react';
import { EmailIntegration, DriveIntegration } from '../components/IntegrationCards';

const Configurations = () => {
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: ''
  });

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      const response = await configurationsAPI.getAll();
      setConfigurations(response.data);
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await configurationsAPI.create(formData);
      setShowForm(false);
      setFormData({ key: '', value: '', description: '' });
      fetchConfigurations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create configuration');
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
          <h1 className="text-3xl font-bold text-gray-900">Configurations</h1>
          <p className="text-gray-600 mt-2">Manage system-wide configuration settings</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          New Configuration
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Configuration</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Key
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g., max_timesheet_hours"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="Configuration value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="input"
                rows="3"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {configurations.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No configurations found</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              Create Your First Configuration
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {configurations.map((config) => (
                  <tr key={config.id}>
                    <td className="font-medium font-mono text-sm">{config.key}</td>
                    <td className="font-mono text-sm">{config.value}</td>
                    <td className="text-sm text-gray-600">{config.description || '-'}</td>
                    <td>
                      <span className={config.is_active ? 'badge-success' : 'badge-gray'}>
                        {config.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(config.updated_at).toLocaleDateString()}</td>
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

export default Configurations;
