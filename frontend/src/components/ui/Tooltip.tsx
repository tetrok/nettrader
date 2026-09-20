import React, { ReactNode } from 'react';

interface TooltipProps {
  content?: string | ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  if (!content) {
    return <>{children}</>;
  }

  const titleString = typeof content === 'string' ? content : undefined;

  return (
    <div
      className={`relative group inline-flex items-center ${className}`}
      title={titleString}
    >
      {children}
      <div
        className={`absolute ${
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        } left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95`}
      >
        <div className="bg-slate-950 text-slate-100 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 max-w-xs text-center leading-relaxed whitespace-normal break-words backdrop-blur-md">
          {content}
        </div>
        <div
          className={`w-2 h-2 bg-slate-950 border-slate-700 ${
            position === 'top'
              ? 'border-r border-b rotate-45 -mt-1'
              : 'border-l border-t rotate-45 -mb-1 order-first'
          }`}
        />
      </div>
    </div>
  );
};
