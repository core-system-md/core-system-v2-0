import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface IdleWatcherProps {
  timeout: number;
  onIdle: () => void;
  onActive?: () => void;
  children: ReactNode;
}

/**
 * CORE SYSTEM v2.1 — IdleWatcher
 * Constitution §3: shared/ component — MAY be imported by ANY layer
 *
 * يكشف عدم نشاط المستخدم عبر أحداث الماوس، لوحة المفاتيح، اللمس، والعجلة.
 * يطلق onIdle مرة واحدة لكل دورة خمول.
 * يطلق onActive مرة واحدة عند العودة.
 * لا يُرسم أي UI — كشف فقط.
 * ينظف جميع Event Listeners و Timers عند Unmount.
 * لا يستخدم أي مكتبات خارجية.
 */
export function IdleWatcher({ timeout, onIdle, onActive, children }: IdleWatcherProps) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const timeoutRef = useRef(timeout);

  // تحديث الـ refs دون إعادة ربط مستمعي DOM
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);
  useEffect(() => { onActiveRef.current = onActive; }, [onActive]);
  useEffect(() => { timeoutRef.current = timeout; }, [timeout]);

  useEffect(() => {
    const handleIdle = () => {
      if (!isIdleRef.current) {
        isIdleRef.current = true;
        onIdleRef.current();
      }
    };

    const resetTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      if (isIdleRef.current) {
        isIdleRef.current = false;
        onActiveRef.current?.();
      }

      idleTimerRef.current = setTimeout(handleIdle, timeoutRef.current);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    const listener = () => resetTimer();

    events.forEach((event) => {
      document.addEventListener(event, listener, { passive: true });
    });

    // بدء المؤقت الأولي
    idleTimerRef.current = setTimeout(handleIdle, timeoutRef.current);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, listener);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []); // deps فارغة — الـ refs تحافظ على تحديث الـ callbacks

  return <>{children}</>;
}
