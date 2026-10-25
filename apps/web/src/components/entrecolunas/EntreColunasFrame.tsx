'use client';

import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

interface EntreColunasFrameProps {
  children: React.ReactNode;
}

export function EntreColunasFrame({ children }: EntreColunasFrameProps) {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#FAF7F2] text-[#1F1914] antialiased selection:bg-[#C9A227]/30 selection:text-[#4B161B]">
      {/*
        COLUNA 1 (ESQUERDA):
        Linha vertical fina em dourado oficial (#C9A227) que acompanha o scroll
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 bottom-0 left-2 sm:left-4 md:left-8 lg:left-12 z-20 flex flex-col items-center"
      >
        <div className="relative h-full w-[1px] bg-gradient-to-b from-transparent via-[#C9A227]/25 to-transparent">
          <motion.div
            style={{ scaleY, transformOrigin: 'top' }}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#DFBE57] via-[#C9A227] to-transparent shadow-[0_0_6px_rgba(201,162,39,0.5)]"
          />
        </div>
      </div>

      {/*
        COLUNA 2 (DIREITA):
        Linha vertical fina em dourado oficial (#C9A227) que acompanha o scroll
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 bottom-0 right-2 sm:right-4 md:right-8 lg:right-12 z-20 flex flex-col items-center"
      >
        <div className="relative h-full w-[1px] bg-gradient-to-b from-transparent via-[#C9A227]/25 to-transparent">
          <motion.div
            style={{ scaleY, transformOrigin: 'top' }}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#DFBE57] via-[#C9A227] to-transparent shadow-[0_0_6px_rgba(201,162,39,0.5)]"
          />
        </div>
      </div>

      {/* Conteúdo principal estruturado entre as colunas guia */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
