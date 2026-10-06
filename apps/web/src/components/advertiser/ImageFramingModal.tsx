'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Move, RotateCcw, X } from 'lucide-react';
import {
  FRAMING_SPEC,
  MAX_ZOOM,
  MIN_ZOOM,
  defaultFraming,
  drawFramed,
  framedSize,
  loadFramingImage,
  renderFramedFile,
  type FramingKind,
  type FramingOptions,
} from '@/lib/media/image-framing';

type Props = {
  kind: FramingKind;
  /** Arquivo escolhido ou endereço da imagem atual (para reenquadrar). */
  source: File | string;
  title?: string;
  /** Recebe o arquivo já enquadrado; devolve erro (texto) para mantê-lo aberto, ou nada para fechar. */
  onConfirm: (file: File) => Promise<string | void>;
  onCancel: () => void;
};

const PRESET_ZOOMS = [0.7, 1, 1.5, 2];

export function ImageFramingModal({ kind, source, title, onConfirm, onCancel }: Props) {
  const spec = FRAMING_SPEC[kind];
  const [options, setOptions] = useState<FramingOptions>(() => defaultFraming(kind));
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const previewW = kind === 'logo' ? 360 : 640;
  const previewH = Math.round((previewW * spec.height) / spec.width);

  // Carrega a imagem uma vez.
  useEffect(() => {
    let disposeFn: (() => void) | null = null;
    let cancelled = false;
    loadFramingImage(source)
      .then(({ img, dispose }) => {
        disposeFn = dispose;
        if (cancelled) return dispose();
        imgRef.current = img;
        setReady(true);
      })
      .catch((error: Error) => setLoadError(error.message));
    return () => {
      cancelled = true;
      disposeFn?.();
    };
  }, [source]);

  // Redesenha a pré-visualização sempre que as opções mudam (mesma função do arquivo final).
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!ready || !canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (ctx) drawFramed(ctx, img, previewW, previewH, options);
  }, [ready, options, previewW, previewH]);

  // ESC fecha (se não estiver enviando).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !submitting && onCancel();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel, submitting]);

  const patch = useCallback((change: Partial<FramingOptions>) => setOptions((current) => ({ ...current, ...change })), []);

  // Arrastar a imagem na pré-visualização move a posição.
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: options.offsetX, oy: options.offsetY };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!start || !img || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = previewW / rect.width;
    const scaleY = previewH / rect.height;
    const size = framedSize(img, previewW, previewH, options);
    const freeX = previewW - size.width;
    const freeY = previewH - size.height;
    const deltaX = (event.clientX - start.x) * scaleX;
    const deltaY = (event.clientY - start.y) * scaleY;
    patch({
      offsetX: Math.min(1, Math.max(0, start.ox + (Math.abs(freeX) > 1 ? deltaX / freeX : 0))),
      offsetY: Math.min(1, Math.max(0, start.oy + (Math.abs(freeY) > 1 ? deltaY / freeY : 0))),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const confirm = async () => {
    const img = imgRef.current;
    if (!img || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const baseName = typeof source === 'string' ? `${kind}-reenquadrado` : source.name;
      const file = await renderFramedFile(img, kind, options, baseName);
      const error = await onConfirm(file);
      if (error) setSubmitError(error);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.');
    } finally {
      setSubmitting(false);
    }
  };

  const chip = (active: boolean) =>
    `min-h-8 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${active ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 text-stone-800 hover:bg-stone-300'}`;

  const transparent = options.background === null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Ajustar ${spec.label}`}>
      <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
          <div>
            <h2 className="font-serif text-base font-bold text-stone-900">{title ?? `Ajustar ${spec.label.toLowerCase()}`}</h2>
            <p className="text-[11px] text-stone-500">Formato {spec.ratio}. Arraste a imagem ou use os controles; o resultado é o que será enviado.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={submitting} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-xs">
          {loadError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-800" role="alert">{loadError}</p>
          ) : (
            <div className="mx-auto w-full" style={{ maxWidth: previewW }}>
              <div
                className="relative overflow-hidden rounded-2xl border border-stone-300 shadow-inner"
                style={transparent ? { backgroundImage: 'repeating-conic-gradient(#e7e5e4 0% 25%, #fafaf9 0% 50%)', backgroundSize: '16px 16px' } : undefined}
              >
                <canvas
                  ref={canvasRef}
                  width={previewW}
                  height={previewH}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="block h-auto w-full cursor-grab touch-none active:cursor-grabbing"
                  aria-label="Pré-visualização do enquadramento"
                />
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {showGuides && ready && (
                  <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-sky-500/70" />
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-sky-500/70" />
                  </div>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
                <Move className="h-3 w-3" aria-hidden /> Arraste para mover · {options.zoom.toFixed(2)}x · X {Math.round(options.offsetX * 100)}% · Y {Math.round(options.offsetY * 100)}%
              </p>
            </div>
          )}

          <fieldset className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3" disabled={!ready || submitting}>
            <legend className="px-1 font-bold text-stone-700">Zoom e posição</legend>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-stone-700">Zoom ({options.zoom.toFixed(2)}x)</span>
                <div className="flex gap-1">
                  {PRESET_ZOOMS.map((zoom) => (
                    <button key={zoom} type="button" className={chip(options.zoom === zoom)} onClick={() => patch({ zoom })}>
                      {zoom}x
                    </button>
                  ))}
                </div>
              </div>
              <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05} value={options.zoom} onChange={(e) => patch({ zoom: Number(e.target.value) })} className="w-full accent-[#3B0B14]" aria-label="Zoom" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-stone-700">Posição horizontal</span>
                <div className="flex gap-1">
                  <button type="button" className={chip(options.offsetX === 0)} onClick={() => patch({ offsetX: 0 })}>Esquerda</button>
                  <button type="button" className={chip(options.offsetX === 0.5)} onClick={() => patch({ offsetX: 0.5 })}>Centro</button>
                  <button type="button" className={chip(options.offsetX === 1)} onClick={() => patch({ offsetX: 1 })}>Direita</button>
                </div>
              </div>
              <input type="range" min={0} max={100} value={Math.round(options.offsetX * 100)} onChange={(e) => patch({ offsetX: Number(e.target.value) / 100 })} className="w-full accent-[#3B0B14]" aria-label="Posição horizontal" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-stone-700">Posição vertical</span>
                <div className="flex gap-1">
                  <button type="button" className={chip(options.offsetY === 0)} onClick={() => patch({ offsetY: 0 })}>Topo</button>
                  <button type="button" className={chip(options.offsetY === 0.5)} onClick={() => patch({ offsetY: 0.5 })}>Centro</button>
                  <button type="button" className={chip(options.offsetY === 1)} onClick={() => patch({ offsetY: 1 })}>Base</button>
                </div>
              </div>
              <input type="range" min={0} max={100} value={Math.round(options.offsetY * 100)} onChange={(e) => patch({ offsetY: Number(e.target.value) / 100 })} className="w-full accent-[#3B0B14]" aria-label="Posição vertical" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={chip(false)} onClick={() => patch({ offsetX: 0.5, offsetY: 0.5 })}>Centralizar</button>
              <button type="button" className={`${chip(false)} inline-flex items-center gap-1`} onClick={() => setOptions(defaultFraming(kind))}>
                <RotateCcw className="h-3 w-3" aria-hidden /> Restaurar
              </button>
              <label className="ml-auto flex min-h-8 items-center gap-1.5 font-medium text-stone-700">
                <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} className="h-4 w-4" /> Guias de centro
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3" disabled={!ready || submitting}>
            <legend className="px-1 font-bold text-stone-700">Ajuste e fundo</legend>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-stone-700">Ajuste:</span>
              <button type="button" className={chip(options.fit === 'cover')} onClick={() => patch({ fit: 'cover' })}>Preencher (corta as bordas)</button>
              <button type="button" className={chip(options.fit === 'contain')} onClick={() => patch({ fit: 'contain' })}>Encaixar (mostra tudo)</button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 font-bold text-stone-700">
                Cor de fundo
                <input
                  type="color"
                  value={options.background ?? '#ffffff'}
                  disabled={transparent}
                  onChange={(e) => patch({ background: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-stone-300 disabled:opacity-40"
                  aria-label="Cor de fundo"
                />
              </label>
              {kind === 'logo' && (
                <label className="flex min-h-8 items-center gap-1.5 font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => patch({ background: e.target.checked ? null : '#ffffff' })}
                    className="h-4 w-4"
                  />
                  Fundo transparente
                </label>
              )}
            </div>
          </fieldset>

          {submitError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-800" role="alert">{submitError}</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-stone-100 px-5 py-3">
          <button type="button" onClick={onCancel} disabled={submitting} className="min-h-10 rounded-xl bg-stone-100 px-4 text-xs font-bold text-stone-700 disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || submitting || Boolean(loadError)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#C9A227]/40 bg-[#3B0B14] px-5 text-xs font-bold text-[#C9A227] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Enviando…' : 'Usar esta imagem'}
          </button>
        </footer>
      </div>
    </div>
  );
}
