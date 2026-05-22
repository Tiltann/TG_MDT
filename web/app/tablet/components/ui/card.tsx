"use client";

export function Card({ children, className = "", quiet = false, ...props }: any) {
  return (
    <div className={`mdt-card ${quiet ? 'mdt-card-quiet':''} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
