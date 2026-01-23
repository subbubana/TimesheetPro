import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, clientsAPI } from '../api/client';
import { AlertCircle } from 'lucide-react';

const EmployeeOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    client_id: '',
    manager_id: '',
    submission_frequency: 'weekly',
    week_start_day: 1,
    role: 'employee',
    is_active: true
  });

  useEffect(() => {
    fetchClients();
    fetchManagers();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data);

      // Auto-select first client if available
      if (response.data.length > 0 && !formData.client_id) {
        const firstClient = response.data[0];
        setFormData(prev => ({
          ...prev,
          client_id: firstClient.id,
          submission_frequency: firstClient.default_submission_frequency
        }));
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await employeesAPI.getAll();
      // Filter for managers and admins
      const managerList = response.data.filter(emp =>
        emp.role === 'manager' || emp.role === 'admin'
      );
      setManagers(managerList);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'client_id') {
      // When client changes, update submission frequency to match client default
      const selectedClient = clients.find(c => c.id === parseInt(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        submission_frequency: selectedClient?.default_submission_frequency || 'weekly'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const employeeData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: 'employee',
        client_id: parseInt(formData.client_id),
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
        submission_frequency: formData.submission_frequency,
        week_start_day: parseInt(formData.week_start_day)
      };

      await employeesAPI.create(employeeData);
      navigate('/employees');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to onboard employee');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employee Onboarding</h1>
        <p className="text-gray-600 mt-2">Add a new employee to the system</p>
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
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                required
                className="input"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                required
                className="input"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                className="input"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                This email will be used to identify timesheets submitted by this employee
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Employees do not log into the system.
                  Timesheets are collected automatically via email/drive monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Client & Manager Assignment */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Client & Manager Assignment</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                name="client_id"
                required
                className="input"
                value={formData.client_id}
                onChange={handleChange}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Which client does this employee work for?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager (Optional)
              </label>
              <select
                name="manager_id"
                className="input"
                value={formData.manager_id}
                onChange={handleChange}
              >
                <option value="">No manager assigned</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name} ({manager.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Who approves this employee's timesheets?
              </p>
            </div>
          </div>
        </div>

        {/* Timesheet Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Timesheet Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submission Frequency *
              </label>
              <select
                name="submission_frequency"
                className="input"
                value={formData.submission_frequency}
                onChange={handleChange}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Inherited from client, can be customized
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Start Day *
              </label>
              <select
                name="week_start_day"
                className="input"
                value={formData.week_start_day}
                onChange={handleChange}
              >
                {weekDays.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Onboarding Employee...' : 'Onboard Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeOnboarding;
