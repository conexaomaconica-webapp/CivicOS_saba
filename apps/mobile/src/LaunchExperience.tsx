import { useEffect, useState } from 'react';

type LaunchExperienceProps = {
  onComplete: () => void;
};

export function LaunchExperience({ onComplete }: LaunchExperienceProps) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const finishWhenBackgrounded = () => {
      if (document.visibilityState === 'hidden') onComplete();
    };
    document.addEventListener('visibilitychange', finishWhenBackgrounded);
    return () => document.removeEventListener('visibilitychange', finishWhenBackgrounded);
  }, [onComplete]);

  if (failed) {
    return (
      <section className="launch-screen launch-fallback" aria-label="Abertura da Conexão Maçônica">
        <button type="button" onClick={onComplete} aria-label="Continuar para o aplicativo">
          <img src="./splash.svg" alt="Conexão Maçônica — Tradição que une, conexão que nos fortalece" />
        </button>
      </section>
    );
  }

  return (
    <section className={`launch-screen${playing ? ' launch-playing' : ''}`} aria-label="Abertura da Conexão Maçônica">
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="./splash.svg"
        onPlay={() => setPlaying(true)}
        onEnded={onComplete}
        onError={() => setFailed(true)}
      >
        <source src="./splash_conexao1.webm" type="video/webm" />
      </video>
    </section>
  );
}
