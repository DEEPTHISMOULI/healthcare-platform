import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner"></div>
      <p className="text-gray">{message}</p>
    </div>
  );
};

export default Loading;
