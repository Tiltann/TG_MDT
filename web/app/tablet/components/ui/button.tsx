"use client";

export function Button({ children, variant = "primary", className = "", ...props }: any) {
  const base = "mdt-btn";
  const variantClass = variant === "primary" ? "mdt-btn-primary" : "mdt-btn-ghost";
  return (
    <button className={`${base} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

export default Button;
