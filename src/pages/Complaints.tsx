import React from 'react';
import { MessageSquare } from 'lucide-react';

const Complaints: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-secondary-900" />
            </div>
            <h1 className="text-3xl font-bold text-white">Complaints</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Capture complaints, track resolution status, and manage tenant issues
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Complaint Management</h2>
            <p className="text-gray-400 mb-6">
              Complaint management functionality will be implemented here. This will include:
            </p>
            <ul className="text-gray-400 text-left max-w-md mx-auto space-y-2">
              <li>• Capture new complaints</li>
              <li>• Track complaint status</li>
              <li>• Assign to staff members</li>
              <li>• Resolution tracking</li>
              <li>• Complaint categories</li>
              <li>• Follow-up management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Complaints;
