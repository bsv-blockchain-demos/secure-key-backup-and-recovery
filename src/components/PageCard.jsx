import React from 'react';

const PageCard = ({ title, children }) => {
  return (
    <div className="page-card">
      <h2 className="page-header">{title}</h2>
      <div className="page-card-content">
        {children}
      </div>
    </div>
  );
};

export default PageCard;
