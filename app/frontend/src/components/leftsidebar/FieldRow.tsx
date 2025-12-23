import React from "react";

export interface FieldRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({
  label,
  children,
  className = "",
  labelClassName = "",
  valueClassName = "",
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <dt
        className={`
          text-[11px] uppercase tracking-wide
          text-gray-500
          dark:text-gray-400
          ${labelClassName}
        `}
      >
        {label}
      </dt>
      <dd
        className={`
          text-gray-900
          dark:text-gray-100
          ${valueClassName}
        `}
      >
        {children}
      </dd>
    </div>
  );
};

export default FieldRow;
