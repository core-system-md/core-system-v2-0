import React from 'react';

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; className?: string }) {
  const { children, className, ...rest } = props;
  return (
    <button {...rest} className={className}>
      {children}
    </button>
  );
}

export default Button;
