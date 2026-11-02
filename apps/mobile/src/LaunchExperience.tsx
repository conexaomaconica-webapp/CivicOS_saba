import { useEffect, useRef, useState } from 'react';

type LaunchExperienceProps = {
  onComplete: () => void;
};

export function LaunchExperience({ onComplete }: LaunchExperienceProps) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Timeout de segurança: nunca trava o app na abertura sob nenhuma hipótese
    const timer = setTimeout(() => {
      onComplete();
    }, 4200);

    const finishWhenBackgrounded = () => {
      if (document.visibilityState === 'hidden') onComplete();
    };
    document.addEventListener('visibilitychange', finishWhenBackgrounded);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', finishWhenBackgrounded);
    };
  }, [onComplete]);

  // Inicialização explícita do vídeo no WebView (Android/iOS)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setPlaying(true))
          .catch((err) => {
            console.warn('[LaunchExperience] Autoplay prevenido ou formato não suportado nativamente:', err);
            setFailed(true);
          });
      }
    }
  }, []);

  // Se o vídeo falhar ou formato não for suportado, exibe imagem institucional e avança automaticamente
  useEffect(() => {
    if (failed) {
      const fallbackTimer = setTimeout(() => {
        onComplete();
      }, 2200);
      return () => clearTimeout(fallbackTimer);
    }
  }, [failed, onComplete]);

  if (failed) {
    return (
      <section className="launch-screen launch-fallback" aria-label="Abertura da Conexão Maçônica">
        <button
          type="button"
          onClick={onComplete}
          className="launch-skip-btn"
          aria-label="Pular abertura"
        >
          Pular
        </button>
        <button type="button" onClick={onComplete} aria-label="Continuar para o aplicativo">
          <img src="./splash.svg" alt="Conexão Maçônica — Tradição que une! conexão que fortalece!" />
        </button>
      </section>
    );
  }

  return (
    <section className={`launch-screen${playing ? ' launch-playing' : ''}`} aria-label="Abertura da Conexão Maçônica">
      <button
        type="button"
        onClick={onComplete}
        className="launch-skip-btn"
        aria-label="Pular abertura"
      >
        Pular
      </button>
      <video
        ref={videoRef}
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
