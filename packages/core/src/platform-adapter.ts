// ============================================================================
// Platform Adapter — Core Kernel
// ============================================================================
// Abstraction layer for platform-specific capabilities (Web vs iOS vs Android).
// Uses the Strategy pattern so plugins consume a uniform API regardless of
// the runtime environment.
//
// INVARIANT: This module contains ZERO business logic.
// ============================================================================

// ---------------------------------------------------------------------------
// Capability Interfaces
// ---------------------------------------------------------------------------

export interface CameraAdapter {
  takePhoto(options?: CameraOptions): Promise<CameraResult>;
  pickFromGallery(options?: CameraOptions): Promise<CameraResult>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
}

export interface CameraOptions {
  quality?: number; // 0-100
  width?: number;
  height?: number;
  resultType?: 'uri' | 'base64' | 'dataUrl';
}

export interface CameraResult {
  data: string; // URI, base64, or data URL depending on resultType
  format: string;
}

export interface GeolocationAdapter {
  getCurrentPosition(options?: GeolocationOptions): Promise<Position>;
  watchPosition(
    callback: (position: Position) => void,
    options?: GeolocationOptions,
  ): string; // watch ID
  clearWatch(watchId: string): void;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface PushAdapter {
  register(): Promise<PushToken>;
  unregister(): Promise<void>;
  onNotification(callback: (notification: PushNotification) => void): () => void;
  onAction(callback: (action: PushAction) => void): () => void;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
}

export interface PushToken {
  value: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushAction {
  actionId: string;
  notification: PushNotification;
}

export interface HapticsAdapter {
  impact(style?: 'light' | 'medium' | 'heavy'): Promise<void>;
  notification(type?: 'success' | 'warning' | 'error'): Promise<void>;
  vibrate(duration?: number): Promise<void>;
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt';

// ---------------------------------------------------------------------------
// Platform Capabilities Aggregate
// ---------------------------------------------------------------------------

export type PlatformType = 'web' | 'ios' | 'android';

export interface PlatformCapabilities {
  readonly platform: PlatformType;
  readonly camera: CameraAdapter | null;
  readonly geolocation: GeolocationAdapter | null;
  readonly pushNotifications: PushAdapter | null;
  readonly haptics: HapticsAdapter | null;
  readonly storage: StorageAdapter;
}

// ---------------------------------------------------------------------------
// Web Default Adapters
// ---------------------------------------------------------------------------

/**
 * Default storage adapter using localStorage (web).
 * Plugins should use this via the DI container, not import directly.
 */
export class WebStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.clear();
  }

  async keys(): Promise<string[]> {
    if (typeof window === 'undefined') return [];
    return Object.keys(window.localStorage);
  }
}

// ---------------------------------------------------------------------------
// Platform Adapter Factory
// ---------------------------------------------------------------------------

/**
 * Create the default web platform capabilities.
 * Mobile adapters (Capacitor) will be registered from `apps/mobile`.
 */
export function createWebPlatform(): PlatformCapabilities {
  return {
    platform: 'web',
    camera: null,
    geolocation: null,
    pushNotifications: null,
    haptics: null,
    storage: new WebStorageAdapter(),
  };
}
