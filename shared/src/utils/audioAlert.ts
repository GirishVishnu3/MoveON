/**
 * Web Audio API synthesize chime for ride requests and driver notifications.
 * Works without any external mp3 files and is guaranteed across all modern browsers.
 */

export function playRideAlertChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Fast attention chime pattern: High C -> E -> G (double strike)
    const tones = [
      { freq: 1046.5, time: 0.0, dur: 0.14 },
      { freq: 1318.5, time: 0.16, dur: 0.14 },
      { freq: 1567.98, time: 0.32, dur: 0.28 },
      { freq: 1046.5, time: 0.7, dur: 0.14 },
      { freq: 1318.5, time: 0.86, dur: 0.14 },
      { freq: 1760.0, time: 1.02, dur: 0.4 },
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.3, now + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (err) {
    console.warn('Could not play audio chime:', err);
  }
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined') return;
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function triggerBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        badge: '/favicon.ico',
        icon: '/favicon.ico',
        ...options,
      });
    }
  } catch (err) {
    console.warn('Could not trigger system notification:', err);
  }
}
