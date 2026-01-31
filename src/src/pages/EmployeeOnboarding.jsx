import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, clientsAPI } from '../api/client';
import { AlertCircle, User, Building2, DollarSign, Clock, X, Check } from 'lucide-react';

const EmployeeOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    manager_id: '',
    week_start_day: 1,
    pay_rate: '',
    overtime_allowed: true,
    client_ids: [],
  });

  const [selectedClients, setSelectedClients] = useState([]);

  useEffect(() => {
    fetchClients();
    fetchManagers();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data.filter(c => c.is_active));
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await employeesAPI.getAll();
      const managerList = response.data.filter(emp =>
        (emp.role === 'manager' || emp.role === 'admin') && emp.is_active
      );
      setManagers(managerList);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    setSelectedClients(prev => {
      const exists = prev.find(c => c.id === clientId);
      if (exists) {
        return prev.filter(c => c.id !== clientId);
      } else {
        return [...prev, client];
      }
    });

    setFormData(prev => {
      const exists = prev.client_ids.includes(clientId);
      if (exists) {
        return { ...prev, client_ids: prev.client_ids.filter(id => id !== clientId) };
      } else {
        return { ...prev, client_ids: [...prev.client_ids, clientId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.client_ids.length === 0) {
        setError('Please select at least one client');
        setLoading(false);
        return;
      }

      const employeeData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
        week_start_day: parseInt(formData.week_start_day),
        pay_rate: formData.pay_rate ? parseFloat(formData.pay_rate) : null,
        overtime_allowed: formData.overtime_allowed,
        client_ids: formData.client_ids,
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
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const steps = [
    { number: 1, title: 'Basic Info', icon: User },
    { number: 2, title: 'Client Assignment', icon: Building2 },
    { number: 3, title: 'Pay & Settings', icon: DollarSign },
  ];

  // Get implied frequency from first selected client
  const impliedFrequency = selectedClients.length > 0
    ? selectedClients[0].default_submission_frequency
    : 'weekly';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employee Onboarding</h1>
        <p className="text-gray-600 mt-2">Add a new employee and assign them to clients</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
                    ${currentStep === step.number
                      ? 'bg-purple-600 text-white'
                      : currentStep > step.number
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-12 mx-2 ${currentStep > step.number ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <User className="h-6 w-6 mr-2 text-purple-600" />
              Basic Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  Used for timesheet identification and notifications
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Employees do not log into the system.
                Timesheets are collected automatically via email/drive monitoring
                and notifications are sent to their email address.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Client Assignment */}
        {currentStep === 2 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Building2 className="h-6 w-6 mr-2 text-purple-600" />
              Client Assignment
            </h2>

            <p className="text-gray-600 mb-4">
              Select the client(s) this employee works for. You can select multiple clients.
            </p>

            {/* Selected Clients */}
            {selectedClients.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Clients ({selectedClients.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedClients.map(client => (
                    <div
                      key={client.id}
                      className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-800 rounded-lg"
                    >
                      <span className="font-medium">{client.name}</span>
                      <span className="text-purple-600 text-sm">({client.code})</span>
                      <button
                        type="button"
                        onClick={() => toggleClient(client.id)}
                        className="p-0.5 hover:bg-purple-200 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Clients */}
            <div className="grid md:grid-cols-2 gap-4">
              {clients.map((client) => {
                const isSelected = formData.client_ids.includes(client.id);
                return (
                  <div
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{client.name}</h3>
                        <p className="text-sm text-gray-500">{client.code}</p>
                        <div className="mt-2 flex items-center space-x-3 text-sm">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                            {client.default_submission_frequency}
                          </span>
                          {client.bill_rate && (
                            <span className="text-green-600">${client.bill_rate}/hr</span>
                          )}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {clients.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No clients available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Please create a client first before onboarding employees
                </p>
              </div>
            )}

            {/* Auto-implied Settings */}
            {selectedClients.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Auto-implied from Primary Client
                </h4>
                <p className="text-sm text-green-800">
                  Timesheet Frequency: <strong className="capitalize">{impliedFrequency}</strong>
                  <span className="text-green-600 ml-2">(from {selectedClients[0].name})</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pay & Settings */}
        {currentStep === 3 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <DollarSign className="h-6 w-6 mr-2 text-purple-600" />
              Pay Rate & Settings
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Rate (per hour)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    name="pay_rate"
                    step="0.01"
                    min="0"
                    className="input pl-8"
                    placeholder="0.00"
                    value={formData.pay_rate}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Employee's hourly pay rate</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Start Day
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

              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="overtime_allowed"
                    checked={formData.overtime_allowed}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Overtime Allowed</span>
                    <p className="text-sm text-gray-500">
                      Allow this employee to log overtime hours
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Name:</dt>
                <dd className="text-gray-900 font-medium">
                  {formData.first_name} {formData.last_name || '-'}
                </dd>

                <dt className="text-gray-500">Email:</dt>
                <dd className="text-gray-900">{formData.email || '-'}</dd>

                <dt className="text-gray-500">Clients:</dt>
                <dd className="text-gray-900">
                  {selectedClients.map(c => c.name).join(', ') || '-'}
                </dd>

                <dt className="text-gray-500">Frequency:</dt>
                <dd className="text-gray-900 capitalize">{impliedFrequency}</dd>

                <dt className="text-gray-500">Pay Rate:</dt>
                <dd className="text-gray-900">
                  {formData.pay_rate ? `$${formData.pay_rate}/hr` : 'Not set'}
                </dd>

                <dt className="text-gray-500">Overtime:</dt>
                <dd className="text-gray-900">
                  {formData.overtime_allowed ? 'Allowed' : 'Not Allowed'}
                </dd>
              </dl>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(s => s - 1) : navigate('/employees')}
            className="btn btn-secondary"
          >
            {currentStep > 1 ? 'Previous' : 'Cancel'}
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(s => s + 1)}
              className="btn btn-primary"
              disabled={currentStep === 2 && formData.client_ids.length === 0}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || formData.client_ids.length === 0}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating Employee...' : 'Create Employee'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default EmployeeOnboarding;
