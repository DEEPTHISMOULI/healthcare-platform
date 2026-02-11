import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ManageUsers = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', marginBottom: '1rem' }}>
        <ArrowLeft size={20} />
        Back to Dashboard
      </Link>
      <h1>Manage Users</h1>
      <p>User management is available in the Admin Dashboard.</p>
    </div>
  );
};

export default ManageUsers;