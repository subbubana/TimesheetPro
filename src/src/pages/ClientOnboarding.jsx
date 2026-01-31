import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI } from '../api/client';
import { AlertCircle, ChevronLeft, ChevronRight, Building2, Calendar, DollarSign, Settings } from 'lucide-react';

const ClientOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    code: '',
    contact_email: '',
    billing_email: '',
    bill_rate: '',

    // Calendar Settings
    week_start_day: 1,
    weekend_days: [0, 6], // Sunday and Saturday

    // Overtime Rules
    overtime_threshold_daily: 8.0,
    overtime_threshold_weekly: 40.0,
    overtime_multiplier: 1.5,

    // Submission Settings
    default_submission_frequency: 'weekly',
    email_inbox_path: '',
    drive_folder_path: '',

    // Selected non-working dates (holidays)
    non_working_dates: [],
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleWeekendDay = (day) => {
    setFormData(prev => {
      const newWeekendDays = prev.weekend_days.includes(day)
        ? prev.weekend_days.filter(d => d !== day)
        : [...prev.weekend_days, day];
      return { ...prev, weekend_days: newWeekendDays };
    });
  };

  const toggleDate = (dateStr) => {
    setFormData(prev => {
      const newDates = prev.non_working_dates.includes(dateStr)
        ? prev.non_working_dates.filter(d => d !== dateStr)
        : [...prev.non_working_dates, dateStr];
      return { ...prev, non_working_dates: newDates };
    });
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isWeekend = (dayOfWeek) => {
    return formData.weekend_days.includes(dayOfWeek);
  };

  const renderMonthCalendar = (monthIndex) => {
    const daysInMonth = getDaysInMonth(currentYear, monthIndex);
    const firstDay = getFirstDayOfMonth(currentYear, monthIndex);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-6 w-6"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, monthIndex, day);
      const dayOfWeek = new Date(currentYear, monthIndex, day).getDay();
      const isWeekendDay = isWeekend(dayOfWeek);
      const isSelected = formData.non_working_dates.includes(dateStr);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => toggleDate(dateStr)}
          className={`h-6 w-6 text-xs rounded-full transition-all flex items-center justify-center
            ${isWeekendDay
              ? 'bg-gray-200 text-gray-500'
              : isSelected
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'hover:bg-blue-100 text-gray-700'
            }`}
          title={isWeekendDay ? 'Weekend (auto non-working)' : isSelected ? 'Click to remove holiday' : 'Click to mark as holiday'}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const clientData = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        contact_email: formData.contact_email || null,
        billing_email: formData.billing_email || null,
        bill_rate: formData.bill_rate ? parseFloat(formData.bill_rate) : null,
        week_start_day: parseInt(formData.week_start_day),
        weekend_days: JSON.stringify(formData.weekend_days),
        overtime_threshold_daily: parseFloat(formData.overtime_threshold_daily),
        overtime_threshold_weekly: parseFloat(formData.overtime_threshold_weekly),
        overtime_multiplier: parseFloat(formData.overtime_multiplier),
        email_inbox_path: formData.email_inbox_path || null,
        drive_folder_path: formData.drive_folder_path || null,
        default_submission_frequency: formData.default_submission_frequency,
        non_working_dates: formData.non_working_dates,
      };

      await clientsAPI.create(clientData);
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to onboard client');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: Building2 },
    { number: 2, title: 'Business Calendar', icon: Calendar },
    { number: 3, title: 'Billing & Rules', icon: DollarSign },
    { number: 4, title: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Onboarding</h1>
        <p className="text-gray-600 mt-2">Configure your client with complete settings and business calendar</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
                    ${currentStep === step.number
                      ? 'bg-blue-600 text-white'
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
              <Building2 className="h-6 w-6 mr-2 text-blue-600" />
              Basic Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Code *
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  className="input uppercase"
                  placeholder="e.g., TC001"
                  value={formData.code}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier for this client</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
        )}

        {/* Step 2: Business Calendar */}
        {currentStep === 2 && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-blue-600" />
                Business Calendar - {currentYear}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentYear(y => y - 1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-semibold text-lg">{currentYear}</span>
                <button
                  type="button"
                  onClick={() => setCurrentYear(y => y + 1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Weekend Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Weekend Days (Non-working by default)
              </label>
              <div className="flex space-x-2">
                {weekDays.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekendDay(index)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all
                      ${formData.weekend_days.includes(index)
                        ? 'bg-gray-700 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mb-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                <span className="text-gray-600">Weekend (Auto)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Holiday (Selected)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-white border border-gray-300 rounded-full"></div>
                <span className="text-gray-600">Working Day</span>
              </div>
            </div>

            {/* 12-Month Calendar Grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {months.map((month, monthIndex) => (
                <div key={month} className="border rounded-lg p-3 bg-white">
                  <h3 className="font-semibold text-sm text-gray-800 mb-2 text-center">
                    {month}
                  </h3>
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {/* Week day headers */}
                    {weekDays.map(day => (
                      <div key={day} className="text-[10px] text-gray-400 font-medium h-4">
                        {day[0]}
                      </div>
                    ))}
                    {/* Calendar days */}
                    {renderMonthCalendar(monthIndex)}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Holidays Summary */}
            {formData.non_working_dates.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Selected Holidays ({formData.non_working_dates.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {formData.non_working_dates.sort().map(date => (
                    <span
                      key={date}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm cursor-pointer hover:bg-blue-200"
                      onClick={() => toggleDate(date)}
                      title="Click to remove"
                    >
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Billing & Rules */}
        {currentStep === 3 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <DollarSign className="h-6 w-6 mr-2 text-blue-600" />
              Billing & Overtime Rules
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Rate (per hour)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    name="bill_rate"
                    step="0.01"
                    min="0"
                    className="input pl-8"
                    placeholder="0.00"
                    value={formData.bill_rate}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Rate charged to client per hour</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Overtime Threshold (hours)
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
                <p className="text-xs text-gray-500 mt-1">Hours per day before overtime kicks in</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Overtime Threshold (hours)
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
                <p className="text-xs text-gray-500 mt-1">Hours per week before overtime kicks in</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overtime Multiplier
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
        )}

        {/* Step 4: Settings */}
        {currentStep === 4 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Settings className="h-6 w-6 mr-2 text-blue-600" />
              Submission Settings
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Timesheet Frequency
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
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="text-xs text-gray-500 mt-1">Email address for timesheet collection</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="text-xs text-gray-500 mt-1">Drive folder path for timesheet collection</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(s => s - 1) : navigate('/clients')}
            className="btn btn-secondary"
          >
            {currentStep > 1 ? 'Previous' : 'Cancel'}
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(s => s + 1)}
              className="btn btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating Client...' : 'Create Client'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ClientOnboarding;
