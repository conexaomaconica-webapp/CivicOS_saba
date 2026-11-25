// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const addListenerMock = vi.fn();
const removeMock = vi.fn(async () => {});
let isNative = false;

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
    getPlatform: () => (isNative ? 'android' : 'web'),
  },
  registerPlugin: () => ({}),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) => addListenerMock(...args),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const { PhotoGalleryLightbox } = await import('./App');

const SAMPLE_PHOTOS = [
  { id: 'p1', url: 'https://cdn.test/1.jpg', title: 'Fachada' },
  { id: 'p2', url: 'https://cdn.test/2.jpg', title: 'Interior' },
];

describe('PhotoGalleryLightbox', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    isNative = false;
    addListenerMock.mockResolvedValue({ remove: removeMock });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('closes via the 44x44 gallery close button and via backdrop click, but not when clicking image or arrows', async () => {
    const onClose = vi.fn();
    const onChangeIndex = vi.fn();

    await act(async () => {
      root.render(
        <PhotoGalleryLightbox
          photos={SAMPLE_PHOTOS}
          currentIndex={0}
          onClose={onClose}
          onChangeIndex={onChangeIndex}
        />,
      );
    });

    const closeBtn = container.querySelector('button[aria-label="Fechar Galeria"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    expect(closeBtn.className).toContain('gallery-lightbox-close');

    const img = container.querySelector('img.gallery-lightbox-img') as HTMLImageElement;
    await act(async () => {
      img.click();
    });
    expect(onClose).not.toHaveBeenCalled();

    const nextBtn = container.querySelector('button[aria-label="Próxima foto"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    expect(onChangeIndex).toHaveBeenCalledWith(1);
    expect(onClose).not.toHaveBeenCalled();

    const overlay = container.querySelector('.gallery-lightbox-overlay') as HTMLDivElement;
    await act(async () => {
      overlay.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape and cleans up Android backButton listener on unmount without duplicates', async () => {
    isNative = true;
    let backCallback: (() => void) | null = null;
    addListenerMock.mockImplementation((event: string, cb: () => void) => {
      if (event === 'backButton') backCallback = cb;
      return Promise.resolve({ remove: removeMock });
    });

    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <PhotoGalleryLightbox
          photos={SAMPLE_PHOTOS}
          currentIndex={0}
          onClose={onClose}
          onChangeIndex={vi.fn()}
        />,
      );
    });

    expect(addListenerMock).toHaveBeenCalledTimes(1);
    expect(addListenerMock).toHaveBeenCalledWith('backButton', expect.any(Function));

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      backCallback?.();
    });
    expect(onClose).toHaveBeenCalledTimes(2);

    await act(async () => {
      root.render(
        <PhotoGalleryLightbox
          photos={SAMPLE_PHOTOS}
          currentIndex={null}
          onClose={onClose}
          onChangeIndex={vi.fn()}
        />,
      );
    });

    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});

