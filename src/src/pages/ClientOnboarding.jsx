import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI, calendarsAPI } from '../api/client';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

const ClientOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calendars, setCalendars] = useState([]);
  const [createNewCalendar, setCreateNewCalendar] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    code: '',
    contact_email: '',
    billing_email: '',

    // Calendar
    calendar_id: '',
    new_calendar_name: '',
    new_calendar_description: '',

    // Overtime Rules
    overtime_threshold_daily: 8.0,
    overtime_threshold_weekly: 40.0,
    overtime_multiplier: 1.5,

    // Submission Settings
    default_submission_frequency: 'weekly',
    email_inbox_path: '',
    drive_folder_path: '',
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
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let calendar_id = formData.calendar_id;

      // Create new calendar if requested
      if (createNewCalendar && formData.new_calendar_name) {
        const calendarResponse = await calendarsAPI.create({
          name: formData.new_calendar_name,
          description: formData.new_calendar_description
        });
        calendar_id = calendarResponse.data.id;
      }

      // Create client
      const clientData = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        contact_email: formData.contact_email || null,
        billing_email: formData.billing_email || null,
        calendar_id: calendar_id ? parseInt(calendar_id) : null,
        overtime_threshold_daily: parseFloat(formData.overtime_threshold_daily),
        overtime_threshold_weekly: parseFloat(formData.overtime_threshold_weekly),
        overtime_multiplier: parseFloat(formData.overtime_multiplier),
        email_inbox_path: formData.email_inbox_path || null,
        drive_folder_path: formData.drive_folder_path || null,
        default_submission_frequency: formData.default_submission_frequency
      };

      await clientsAPI.create(clientData);
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to onboard client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Onboarding</h1>
        <p className="text-gray-600 mt-2">Add a new client with complete configuration</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="input"
                placeholder="e.g., Tech Corp Inc."
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Code *
              </label>
              <input
                type="text"
                name="code"
                required
                className="input"
                placeholder="e.g., TC001"
                value={formData.code}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                className="input"
                placeholder="contact@techcorp.com"
                value={formData.contact_email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Email
              </label>
              <input
                type="email"
                name="billing_email"
                className="input"
                placeholder="billing@techcorp.com"
                value={formData.billing_email}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Holiday Calendar */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Holiday Calendar</h2>

          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={createNewCalendar}
                onChange={(e) => setCreateNewCalendar(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Create new calendar for this client</span>
            </label>
          </div>

          {createNewCalendar ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar Name *
                </label>
                <input
                  type="text"
                  name="new_calendar_name"
                  required={createNewCalendar}
                  className="input"
                  placeholder="e.g., Tech Corp Holidays 2026"
                  value={formData.new_calendar_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="new_calendar_description"
                  className="input"
                  rows="2"
                  placeholder="Optional description"
                  value={formData.new_calendar_description}
                  onChange={handleChange}
                />
              </div>

              <p className="text-sm text-gray-600">
                Note: You can add holidays to this calendar after creating the client
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Existing Calendar
              </label>
              <select
                name="calendar_id"
                className="input"
                value={formData.calendar_id}
                onChange={handleChange}
              >
                <option value="">No calendar (optional)</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Overtime Rules */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Overtime Rules</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Threshold (hours) *
              </label>
              <input
                type="number"
                name="overtime_threshold_daily"
                step="0.5"
                min="0"
                required
                className="input"
                value={formData.overtime_threshold_daily}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">Hours per day before overtime</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Threshold (hours) *
              </label>
              <input
                type="number"
                name="overtime_threshold_weekly"
                step="0.5"
                min="0"
                required
                className="input"
                value={formData.overtime_threshold_weekly}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">Hours per week before overtime</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overtime Multiplier *
              </label>
              <input
                type="number"
                name="overtime_multiplier"
                step="0.1"
                min="1"
                required
                className="input"
                value={formData.overtime_multiplier}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">e.g., 1.5 for time-and-a-half</p>
            </div>
          </div>
        </div>

        {/* Submission Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Submission Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Submission Frequency *
              </label>
              <select
                name="default_submission_frequency"
                className="input"
                value={formData.default_submission_frequency}
                onChange={handleChange}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Default for employees under this client</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Inbox Path
              </label>
              <input
                type="text"
                name="email_inbox_path"
                className="input"
                placeholder="e.g., timesheets@yourcompany.com"
                value={formData.email_inbox_path}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">Email address for agent to monitor for timesheets</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Drive Folder Path
              </label>
              <input
                type="text"
                name="drive_folder_path"
                className="input"
                placeholder="e.g., /Timesheets/TechCorp"
                value={formData.drive_folder_path}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">Drive folder path for agent to monitor for timesheets</p>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Onboarding Client...' : 'Onboard Client'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientOnboarding;
