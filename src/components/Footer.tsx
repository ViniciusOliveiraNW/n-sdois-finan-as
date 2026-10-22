import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-[#0b1320] border-t border-slate-200/80 dark:border-slate-800 py-4 mt-auto shadow-[0_-1px_4px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 dark:text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <span>NósDois Finanças • Gestão Compartilhada Vinicius & Silvia</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
            <span>Vinicius</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#712ae2]"></span>
            <span>Silvia</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-600 dark:text-slate-400">Divisão Justa & Transparente</span>
        </div>
      </div>
    </footer>
  );
};
