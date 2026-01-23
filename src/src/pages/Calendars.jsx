import { useEffect, useState } from 'react';
import { calendarsAPI } from '../api/client';
import { Calendar, Plus, AlertCircle } from 'lucide-react';

const Calendars = () => {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      const response = await calendarsAPI.getAll();
      setCalendars(response.data);
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await calendarsAPI.create(formData);
      setShowForm(false);
      setFormData({ name: '', description: '' });
      fetchCalendars();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create calendar');
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
          <h1 className="text-3xl font-bold text-gray-900">Holiday Calendars</h1>
          <p className="text-gray-600 mt-2">Manage holiday calendars for different clients and regions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          New Calendar
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Calendar</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calendar Name
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g., US Holidays 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                Create Calendar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {calendars.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No calendars found</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              Create Your First Calendar
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <Calendar className="h-8 w-8 text-primary-600" />
                  <span className={calendar.is_active ? 'badge-success' : 'badge-gray'}>
                    {calendar.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{calendar.name}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {calendar.description || 'No description'}
                </p>
                <div className="text-xs text-gray-500">
                  Created: {new Date(calendar.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendars;
