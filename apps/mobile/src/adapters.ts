// ============================================================================
// Capacitor Platform Adapters
// ============================================================================
// Implements PlatformCapabilities from @saas/core using Capacitor plugins.
// These adapters are only used in the mobile build.
// ============================================================================

import type {
  PlatformCapabilities,
  PlatformType,
  StorageAdapter,
  CameraAdapter,
  CameraOptions,
  CameraResult,
  HapticsAdapter,
} from '@saas/core';

// ---------------------------------------------------------------------------
// Storage Adapter (Capacitor Preferences)
// ---------------------------------------------------------------------------

export class CapacitorStorageAdapter implements StorageAdapter {
  private preferences: typeof import('@capacitor/preferences').Preferences | null = null;

  private async getPreferences() {
    if (!this.preferences) {
      const mod = await import('@capacitor/preferences');
      this.preferences = mod.Preferences;
    }
    return this.preferences;
  }

  async get(key: string): Promise<string | null> {
    const prefs = await this.getPreferences();
    const result = await prefs.get({ key });
    return result.value;
  }

  async set(key: string, value: string): Promise<void> {
    const prefs = await this.getPreferences();
    await prefs.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    const prefs = await this.getPreferences();
    await prefs.remove({ key });
  }

  async clear(): Promise<void> {
    const prefs = await this.getPreferences();
    await prefs.clear();
  }

  async keys(): Promise<string[]> {
    const prefs = await this.getPreferences();
    const result = await prefs.keys();
    return result.keys;
  }
}

// ---------------------------------------------------------------------------
// Camera Adapter
// ---------------------------------------------------------------------------

export class CapacitorCameraAdapter implements CameraAdapter {
  async takePhoto(options?: CameraOptions): Promise<CameraResult> {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: options?.quality ?? 90,
      width: options?.width,
      height: options?.height,
      resultType: this.mapResultType(options?.resultType),
      source: CameraSource.Camera,
    });

    return {
      data: photo.dataUrl ?? photo.base64String ?? photo.webPath ?? '',
      format: photo.format,
    };
  }

  async pickFromGallery(options?: CameraOptions): Promise<CameraResult> {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: options?.quality ?? 90,
      width: options?.width,
      height: options?.height,
      resultType: this.mapResultType(options?.resultType),
      source: CameraSource.Photos,
    });

    return {
      data: photo.dataUrl ?? photo.base64String ?? photo.webPath ?? '',
      format: photo.format,
    };
  }

  async checkPermissions() {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.checkPermissions();
    return result.camera as 'granted' | 'denied' | 'prompt';
  }

  async requestPermissions() {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.requestPermissions();
    return result.camera as 'granted' | 'denied' | 'prompt';
  }

  private mapResultType(type?: string) {
    // Dynamic import already loaded CameraResultType above
    // Return string literal that Capacitor understands
    switch (type) {
      case 'base64': return 'base64' as const;
      case 'dataUrl': return 'dataUrl' as const;
      default: return 'uri' as const;
    }
  }
}

// ---------------------------------------------------------------------------
// Haptics Adapter
// ---------------------------------------------------------------------------

export class CapacitorHapticsAdapter implements HapticsAdapter {
  async impact(style?: 'light' | 'medium' | 'heavy'): Promise<void> {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style ?? 'medium'] });
  }

  async notification(type?: 'success' | 'warning' | 'error'): Promise<void> {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await Haptics.notification({ type: typeMap[type ?? 'success'] });
  }

  async vibrate(duration?: number): Promise<void> {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration: duration ?? 300 });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCapacitorPlatform(platformType: 'ios' | 'android'): PlatformCapabilities {
  return {
    platform: platformType,
    camera: new CapacitorCameraAdapter(),
    geolocation: null, // TODO: Implement CapacitorGeolocationAdapter
    pushNotifications: null, // TODO: Implement CapacitorPushAdapter
    haptics: new CapacitorHapticsAdapter(),
    storage: new CapacitorStorageAdapter(),
  };
}
