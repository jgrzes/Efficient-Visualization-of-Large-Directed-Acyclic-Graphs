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
        className={`text-[11px] uppercase tracking-wide text-gray-400 ${labelClassName}`}
      >
        {label}
      </dt>
      <dd className={valueClassName}>{children}</dd>
    </div>
  );
};

export default FieldRow;
