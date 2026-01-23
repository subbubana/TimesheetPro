import { Link } from 'react-router-dom';
import { Clock, Mail, FileText, DollarSign, Calendar, Bot } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Mail,
      title: 'Automated Collection',
      description: 'AI agent monitors email inboxes and Google Drive for employee timesheet submissions automatically.'
    },
    {
      icon: Bot,
      title: 'Intelligent Processing',
      description: 'Smart processing of multiple timesheet formats including Excel, PDF, and CSV files.'
    },
    {
      icon: FileText,
      title: 'Multi-Client Management',
      description: 'Manage timesheets for employees across multiple client projects with custom configurations.'
    },
    {
      icon: Calendar,
      title: 'Holiday Calendars',
      description: 'Client-specific holiday calendars with automatic holiday flagging and overtime calculation.'
    },
    {
      icon: DollarSign,
      title: 'Invoice Generation',
      description: 'Automated billing based on approved hours with customizable overtime rates per client.'
    },
    {
      icon: Clock,
      title: 'Approval Workflows',
      description: 'Streamlined timesheet approval process with multi-level authorization and audit trails.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">TimesheetPro</span>
            </div>
            <div className="flex items-center">
              <Link to="/login" className="btn btn-primary">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Staffing Vendor Timesheet
            <span className="block text-primary-600">& Billing Management</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Automate timesheet collection from email and drive. Process employee hours across multiple clients.
            Generate accurate invoices based on approved timesheets.
          </p>
          <div className="flex justify-center">
            <Link to="/login" className="btn btn-primary text-lg px-10 py-4">
              Access Dashboard
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-20 card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Streamline Your Operations</h2>
            <p className="text-lg mb-8 text-primary-100">
              Reduce manual processing time. Increase billing accuracy. Scale your staffing business efficiently.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-primary-100">Automated Collection</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">50+</div>
                <div className="text-primary-100">Hours Saved/Week</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">99.9%</div>
                <div className="text-primary-100">Billing Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2026 TimesheetPro. Staffing vendor management platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
