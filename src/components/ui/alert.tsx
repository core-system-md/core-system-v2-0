import React from 'react';

export function Alert(props: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) {
  return <div {...props} />;
}

export function AlertDescription(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export default Alert;
