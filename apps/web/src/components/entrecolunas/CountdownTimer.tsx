'use client';

import React, { useEffect, useState } from 'react';

const TARGET_DATE = new Date('2026-11-24T19:00:00-03:00').getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = TARGET_DATE - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto my-6 opacity-60">
        {['Dias', 'Horas', 'Min', 'Seg'].map((label) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-[#230c12]/60 border border-[#c9a45c]/15"
          >
            <span className="text-xl sm:text-2xl md:text-3xl font-serif text-[#e8cf94]">--</span>
            <span className="text-[10px] sm:text-xs text-[#d6cbbe]/70 uppercase tracking-wider mt-1">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Dias', value: String(timeLeft.days).padStart(2, '0') },
    { label: 'Horas', value: String(timeLeft.hours).padStart(2, '0') },
    { label: 'Min', value: String(timeLeft.minutes).padStart(2, '0') },
    { label: 'Seg', value: String(timeLeft.seconds).padStart(2, '0') },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto my-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl bg-gradient-to-b from-[#2e0e16]/80 to-[#1e070c]/90 border border-[#c9a45c]/25 shadow-lg shadow-[#000000]/40 backdrop-blur-sm"
        >
          <span className="text-xl sm:text-2xl md:text-3xl font-serif font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#f5dfa8] via-[#e8cf94] to-[#c9a45c]">
            {item.value}
          </span>
          <span className="text-[10px] sm:text-xs text-[#d6cbbe]/80 font-medium uppercase tracking-wider mt-1">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
