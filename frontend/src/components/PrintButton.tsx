import React from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
}

const PrintButton: React.FC<PrintButtonProps> = ({ label = 'Print' }) => {
  return (
    <button
      className="btn btn-secondary btn-sm no-print"
      onClick={() => window.print()}
      id="print-btn"
    >
      <Printer size={15} />
      {label}
    </button>
  );
};

export default PrintButton;
