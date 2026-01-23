import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { timesheetsAPI, clientsAPI } from '../api/client';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

const TimesheetForm = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [formData, setFormData] = useState({
    client_id: '',
    period_start: format(weekStart, 'yyyy-MM-dd'),
    period_end: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
    notes: '',
    details: Array.from({ length: 7 }, (_, i) => ({
      work_date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
      hours: 0,
      overtime_hours: 0,
      description: ''
    }))
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, client_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index][field] = field === 'hours' || field === 'overtime_hours' ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, details: newDetails });
  };

  const handleAddDay = () => {
    const lastDate = formData.details[formData.details.length - 1]?.work_date || format(new Date(), 'yyyy-MM-dd');
    setFormData({
      ...formData,
      details: [...formData.details, {
        work_date: format(addDays(new Date(lastDate), 1), 'yyyy-MM-dd'),
        hours: 0,
        overtime_hours: 0,
        description: ''
      }]
    });
  };

  const handleRemoveDay = (index) => {
    if (formData.details.length > 1) {
      const newDetails = formData.details.filter((_, i) => i !== index);
      setFormData({ ...formData, details: newDetails });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const filteredDetails = formData.details.filter(d => d.hours > 0);
      const response = await timesheetsAPI.create({
        ...formData,
        client_id: parseInt(formData.client_id),
        details: filteredDetails
      });

      navigate(`/timesheets/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create timesheet');
    } finally {
      setLoading(false);
    }
  };

  const totalHours = formData.details.reduce((sum, d) => sum + d.hours, 0);
  const totalOvertime = formData.details.reduce((sum, d) => sum + d.overtime_hours, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">New Timesheet</h1>
        <p className="text-gray-600 mt-2">Create a new timesheet entry</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Timesheet Information</h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                required
                className="input"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                className="input"
                placeholder="Optional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
              <input
                type="date"
                required
                className="input"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
              <input
                type="date"
                required
                className="input"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daily Hours</h2>
            <button type="button" onClick={handleAddDay} className="btn btn-secondary text-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Day
            </button>
          </div>

          <div className="space-y-3">
            {formData.details.map((detail, index) => (
              <div key={index} className="grid md:grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                <div className="md:col-span-3">
                  <input
                    type="date"
                    required
                    className="input"
                    value={detail.work_date}
                    onChange={(e) => handleDetailChange(index, 'work_date', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    placeholder="Hours"
                    className="input"
                    value={detail.hours}
                    onChange={(e) => handleDetailChange(index, 'hours', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    placeholder="OT Hours"
                    className="input"
                    value={detail.overtime_hours}
                    onChange={(e) => handleDetailChange(index, 'overtime_hours', e.target.value)}
                  />
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    placeholder="Description"
                    className="input"
                    value={detail.description}
                    onChange={(e) => handleDetailChange(index, 'description', e.target.value)}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(index)}
                    className="text-red-600 hover:text-red-700"
                    disabled={formData.details.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-primary-50 rounded-lg">
            <div className="flex justify-between text-sm font-medium">
              <span>Total Hours:</span>
              <span>{totalHours.toFixed(1)} hrs</span>
            </div>
            {totalOvertime > 0 && (
              <div className="flex justify-between text-sm font-medium text-orange-600 mt-1">
                <span>Total Overtime:</span>
                <span>{totalOvertime.toFixed(1)} hrs</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/timesheets')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Timesheet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TimesheetForm;
