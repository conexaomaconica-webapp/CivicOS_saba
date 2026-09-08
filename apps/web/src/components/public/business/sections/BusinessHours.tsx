import React from 'react';
import { Clock } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

const DAY_SHORT_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type BusinessHoursProps = {
  hours: PublicBusinessPresentation['hours'];
  className?: string;
};

export function BusinessHours({
  hours,
  className = '',
}: BusinessHoursProps) {
  if (!hours || hours.length === 0) return null;

  return (
    <section className={`p-4 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <h3 className="font-serif font-bold text-sm text-[#4B161B] tracking-tight flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-[#C9A227]" />
          <span>Funcionamento</span>
        </h3>
      </div>

      <div className="space-y-1.5 text-xs">
        {hours.map((h) => {
          const dayName = DAY_SHORT_LABELS[h.dayOfWeek] || `Dia ${h.dayOfWeek}`;
          return (
            <div
              key={h.dayOfWeek}
              className="flex items-center justify-between py-1 border-b border-stone-50 last:border-none"
            >
              <span className="text-stone-700 font-medium">{dayName}</span>
              {h.isClosed ? (
                <span className="text-[#4B161B] font-semibold">Fechado</span>
              ) : (
                <span className="text-stone-900 font-bold">
                  {h.openTime || '08:00'} - {h.closeTime || '18:00'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
