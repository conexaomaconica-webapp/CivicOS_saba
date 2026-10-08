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
  GeolocationAdapter,
  GeolocationOptions,
  Position,
  PushAdapter,
  PushToken,
  PushNotification,
  PushAction,
  PermissionStatus,
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
    const { Camera, CameraSource } = await import('@capacitor/camera');
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
    const { Camera, CameraSource } = await import('@capacitor/camera');
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

  async checkPermissions(): Promise<PermissionStatus> {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.checkPermissions();
    return (result.camera as PermissionStatus) ?? 'prompt';
  }

  async requestPermissions(): Promise<PermissionStatus> {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.requestPermissions();
    return (result.camera as PermissionStatus) ?? 'prompt';
  }

  private mapResultType(type?: string) {
    switch (type) {
      case 'base64': return 'base64' as const;
      case 'dataUrl': return 'dataUrl' as const;
      default: return 'uri' as const;
    }
  }
}

// ---------------------------------------------------------------------------
// Geolocation Adapter
// ---------------------------------------------------------------------------

export class CapacitorGeolocationAdapter implements GeolocationAdapter {
  async getCurrentPosition(options?: GeolocationOptions): Promise<Position> {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0,
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude ?? null,
      altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
      heading: pos.coords.heading ?? null,
      speed: pos.coords.speed ?? null,
      timestamp: pos.timestamp,
    };
  }

  watchPosition(
    callback: (position: Position) => void,
    options?: GeolocationOptions,
  ): string {
    const watchId = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    import('@capacitor/geolocation').then(({ Geolocation }) => {
      Geolocation.watchPosition(
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0,
        },
        (pos, err) => {
          if (pos && !err) {
            callback({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude ?? null,
              altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ?? null,
              timestamp: pos.timestamp,
            });
          }
        },
      );
    });
    return watchId;
  }

  clearWatch(watchId: string): void {
    import('@capacitor/geolocation').then(({ Geolocation }) => {
      Geolocation.clearWatch({ id: watchId });
    });
  }

  async checkPermissions(): Promise<PermissionStatus> {
    const { Geolocation } = await import('@capacitor/geolocation');
    const result = await Geolocation.checkPermissions();
    return (result.location as PermissionStatus) ?? 'prompt';
  }

  async requestPermissions(): Promise<PermissionStatus> {
    const { Geolocation } = await import('@capacitor/geolocation');
    const result = await Geolocation.requestPermissions();
    return (result.location as PermissionStatus) ?? 'prompt';
  }
}

// ---------------------------------------------------------------------------
// Push Adapter
// ---------------------------------------------------------------------------

export class CapacitorPushAdapter implements PushAdapter {
  private lastToken: string | null = null;

  async register(): Promise<PushToken> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.register();
    return new Promise((resolve, reject) => {
      PushNotifications.addListener('registration', (token) => {
        this.lastToken = token.value;
        resolve({ value: token.value });
      });
      PushNotifications.addListener('registrationError', (err) => {
        reject(new Error(err.error));
      });
    });
  }

  async unregister(): Promise<void> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
    this.lastToken = null;
  }

  onNotification(callback: (notification: PushNotification) => void): () => void {
    let listener: any = null;
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        callback({
          id: notification.id,
          title: notification.title ?? '',
          body: notification.body ?? '',
          data: notification.data,
        });
      }).then((handle) => {
        listener = handle;
      });
    });
    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }

  onAction(callback: (action: PushAction) => void): () => void {
    let listener: any = null;
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        callback({
          actionId: action.actionId,
          notification: {
            id: action.notification.id,
            title: action.notification.title ?? '',
            body: action.notification.body ?? '',
            data: action.notification.data,
          },
        });
      }).then((handle) => {
        listener = handle;
      });
    });
    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.checkPermissions();
    return (result.receive as PermissionStatus) ?? 'prompt';
  }

  async requestPermissions(): Promise<PermissionStatus> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    return (result.receive as PermissionStatus) ?? 'prompt';
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
    geolocation: new CapacitorGeolocationAdapter(),
    pushNotifications: new CapacitorPushAdapter(),
    haptics: new CapacitorHapticsAdapter(),
    storage: new CapacitorStorageAdapter(),
  };
}
