import React from 'react';

interface ControlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

const ControlButton = React.forwardRef<HTMLButtonElement, ControlButtonProps>(
  ({ label, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className="px-4 py-2 bg-transparent border border-white text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 cursor-pointer"
      >
        {label}
      </button>
    );
  }
);

ControlButton.displayName = 'ControlButton';

export default ControlButton;
