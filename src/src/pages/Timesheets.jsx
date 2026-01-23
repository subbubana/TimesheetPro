import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { timesheetsAPI } from '../api/client';
import { Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  useEffect(() => {
    fetchTimesheets();
  }, [statusFilter]);

  const fetchTimesheets = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await timesheetsAPI.getAll(params);
      setTimesheets(response.data);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-gray',
      submitted: 'badge-info',
      approved: 'badge-success',
      rejected: 'badge-danger'
    };
    return `badge ${badges[status]}`;
  };

  const handleStatusFilter = (status) => {
    if (status === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status });
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-gray-600 mt-2">View and approve employee timesheets collected via email/drive</p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex space-x-2">
            {['all', 'draft', 'submitted', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {timesheets.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {statusFilter === 'all' ? 'No timesheets collected yet' : `No ${statusFilter} timesheets`}
            </p>
            <p className="text-sm text-gray-500">
              Timesheets will appear here once employees submit them via email or drive
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Client ID</th>
                  <th>Total Hours</th>
                  <th>Overtime</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td>
                      {format(new Date(timesheet.period_start), 'MMM dd')} -{' '}
                      {format(new Date(timesheet.period_end), 'MMM dd, yyyy')}
                    </td>
                    <td>{timesheet.client_id}</td>
                    <td>{timesheet.total_hours.toFixed(1)} hrs</td>
                    <td className={timesheet.total_overtime > 0 ? 'text-orange-600 font-medium' : ''}>
                      {timesheet.total_overtime.toFixed(1)} hrs
                    </td>
                    <td>
                      <span className={getStatusBadge(timesheet.status)}>
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {timesheet.submission_date
                        ? format(new Date(timesheet.submission_date), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </td>
                    <td className="space-x-2">
                      <Link
                        to={`/timesheets/${timesheet.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </Link>
                      {timesheet.status === 'draft' && (
                        <Link
                          to={`/timesheets/${timesheet.id}/edit`}
                          className="text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Edit
                        </Link>
                      )}
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

export default Timesheets;
