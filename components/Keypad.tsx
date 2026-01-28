import React from 'react';
import { Delete, Eraser } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface KeypadProps {
  onKeyPress: (val: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({ onKeyPress, onDelete, onClear }) => {
  const buttons = [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '00', value: '00' }, // Quick thousands
    { label: '0', value: '0' },
    { label: '000', value: '000' }, // Quick millions
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto mt-6">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={() => onKeyPress(btn.value)}
          className="h-14 rounded-xl bg-white border border-slate-200 shadow-sm text-xl font-medium text-slate-700 active:scale-95 transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
        >
          {btn.label}
        </button>
      ))}
      <button
        onClick={onClear}
        className="h-14 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center active:scale-95 transition-all hover:bg-rose-100"
      >
        <Eraser className="w-6 h-6" />
      </button>
      <button
        onClick={onDelete}
        className="col-span-2 h-14 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center active:scale-95 transition-all hover:bg-slate-200"
      >
        <Delete className="w-6 h-6" />
      </button>
    </div>
  );
};
