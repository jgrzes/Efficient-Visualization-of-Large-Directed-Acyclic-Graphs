import React from 'react';

interface ControlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

const ControlButton = React.forwardRef<HTMLButtonElement, ControlButtonProps>(
  ({ label, ...props }, ref) => {
    return (
      <button ref={ref} {...props} className="control-button">
        {label}
      </button>
    );
  }
);

ControlButton.displayName = 'ControlButton';

export default ControlButton;
