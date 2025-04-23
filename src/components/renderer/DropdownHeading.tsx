import React, { useState } from 'react';

export type DropdownItemProps = {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
};

export const DropdownItem = ({ onClick, className, children }: DropdownItemProps) => (
  <div className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${className}`} onClick={onClick}>
    {children}
  </div>
);

const DropdownHeading = ({ title, className, children }: { title: string; className?: string; children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${className} flex flex-col overflow-hidden ${open ? 'pb-2' : ''}`}>
      <div className="flex items-center justify-between p-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={() => setOpen(!open)} type="button" className="cursor-pointer">
          <svg className={`w-4 h-4 opacity-50 transform transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 8L10 13L15 8H5Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="pt-2 flex flex-col border-t border-gray-200 mt-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default DropdownHeading;
