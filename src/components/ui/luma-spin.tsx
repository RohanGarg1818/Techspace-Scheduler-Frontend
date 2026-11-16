import React from "react";

export interface LumaSpinProps {
  className?: string;
  size?: number | string;
  color?: string;
}

export function LumaSpin({ className = "", size, color }: LumaSpinProps) {
  const containerStyle: React.CSSProperties = {
    ...(size ? { width: size, height: size } : {}),
    ...(color ? { color } : {}),
  };

  const spanClasses = color
    ? "absolute rounded-[50px] animate-loaderAnim shadow-[inset_0_0_0_3px] shadow-current"
    : "absolute rounded-[50px] animate-loaderAnim shadow-[inset_0_0_0_3px] shadow-[#1E1B18] dark:shadow-[#F2F2F3]";

  return (
    <div
      className={`relative w-[65px] aspect-square ${className}`}
      style={containerStyle}
    >
      <span className={spanClasses} />
      <span className={`${spanClasses} animation-delay`} />
    </div>
  );
}

export const Component = LumaSpin;
export default LumaSpin;
