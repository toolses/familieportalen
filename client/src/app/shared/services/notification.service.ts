import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { HouseholdService } from './household.service';
import { environment } from '../../../environments/environment';
import { firebaseDb as db } from '../../core/firebase';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private household = inject(HouseholdService);

  /** Reflekterer nåværende tillatelsestatus, oppdateres etter kall til requestPermission() */
  readonly permissionState = signal<PushPermissionState>(this.currentPermission());

  /** True dersom appen kjører som installert PWA (standalone-modus) */
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  /** True dersom nettleseren støtter push-varsler */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Ber brukeren om tillatelse og lagrer FCM-token i Firestore.
   * Returnerer true dersom tillatelse ble gitt og token ble lagret.
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      this.permissionState.set('unsupported');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permissionState.set(permission as PushPermissionState);

    if (permission !== 'granted') return false;

    await this.saveFcmToken();
    return true;
  }

  /** Lytter på meldinger som mottas mens appen er åpen (forgrunn) */
  listenForeground(): void {
    if (!this.isSupported()) return;
    const messaging = getMessaging(getApp());
    onMessage(messaging, (payload) => {
      console.log('[NotificationService] Forgrunnmelding:', payload);
      // Vis en enkel nettleser-notifikasjon dersom innebygd push ikke vises
      if (Notification.permission === 'granted' && payload.notification) {
        new Notification(payload.notification.title ?? 'Familieportalen', {
          body: payload.notification.body,
          icon: '/icon-192.png',
        });
      }
    });
  }

  private async saveFcmToken(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    if (!environment.fcmVapidKey || environment.fcmVapidKey.startsWith('REPLACE_')) {
      console.warn('[NotificationService] VAPID-nøkkel er ikke konfigurert i environment.');
      return;
    }

    try {
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });

      const messaging = getMessaging(getApp());
      const token = await getToken(messaging, {
        vapidKey: environment.fcmVapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) return;

      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const existingTokens: string[] = snap.data()?.['fcmTokens'] ?? [];

      if (!existingTokens.includes(token)) {
        await setDoc(userRef, { fcmTokens: [...existingTokens, token] }, { merge: true });
        await this.household.markHasPush(user.uid);
        console.log('[NotificationService] FCM-token lagret.');
      }
    } catch (err) {
      console.error('[NotificationService] Feil ved henting/lagring av FCM-token:', err);
    }
  }

  private currentPermission(): PushPermissionState {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PushPermissionState;
  }

  /**
   * Sender et test-varsel til den innloggede brukeren (kun for admins).
   * Kaller POST /api/notifications/test på backend.
   */
  async triggerDailyReminders(): Promise<{ sent?: number; failed?: number; message?: string }> {
    return firstValueFrom(
      this.http.post<{ sent?: number; failed?: number; message?: string }>('/api/notifications/trigger-daily-reminders', {})
    );
  }

  async sendTestNotification(): Promise<{ sent: number; failed: number; message?: string }> {
    return firstValueFrom(
      this.http.post<{ sent: number; failed: number; message?: string }>(
        '/api/notifications/test',
        {}
      )
    );
  }
}
