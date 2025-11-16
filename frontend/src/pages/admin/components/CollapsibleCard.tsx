import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CollapsibleCardProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  description?: string;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, defaultOpen = false, children, description }) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="bg-white shadow rounded-lg transform transition duration-150 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:ring-1 hover:ring-indigo-100">
      <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        <button
          className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          {open ? (
            <>
              <ChevronUpIcon className="h-5 w-5 mr-2" /> 收起
            </>
          ) : (
            <>
              <ChevronDownIcon className="h-5 w-5 mr-2" /> 展开
            </>
          )}
        </button>
      </div>
      {open && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;
