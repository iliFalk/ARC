import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow",
    secondary: "bg-muted text-foreground hover:bg-muted/80",
    ghost: "hover:bg-muted hover:text-foreground",
    icon: "h-9 w-9 p-0 hover:bg-muted rounded-full"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2 text-sm",
    lg: "h-10 px-8 text-base",
  };

  // Override size for icon variant
  const finalSize = variant === 'icon' ? '' : sizes[size];

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${finalSize} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};