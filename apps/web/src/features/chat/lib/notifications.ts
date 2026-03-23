// TODO: Add notification sound file at /public/sounds/notification.mp3
let notificationSound: HTMLAudioElement | null = null

export function playNotificationSound(): void {
  if (typeof window === 'undefined') return
  if (!notificationSound) {
    notificationSound = new Audio('/sounds/notification.mp3')
    notificationSound.volume = 0.5
  }
  void notificationSound.play().catch(() => {
    // Browser may block autoplay — ignore silently
  })
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icon-192.png' })
}
