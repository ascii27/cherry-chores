export function isMobilePhone(): boolean {
  try {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const phoneUA = /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(ua);
    const iPad = /iPad|Macintosh/i.test(ua) && 'ontouchend' in document;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const narrow = Math.min(window.innerWidth, window.innerHeight) <= 576;
    return (phoneUA || (coarse && narrow)) && !iPad;
  } catch {
    return false;
  }
}

export function initMobileClass(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isMobilePhone()) {
    document.documentElement.classList.add('is-mobile');
  } else {
    document.documentElement.classList.remove('is-mobile');
  }
}
