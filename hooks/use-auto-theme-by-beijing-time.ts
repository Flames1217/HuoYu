import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * 根据东八区（北京时间）自动切换主题：
 * 06:00-18:00 为 light，其他时间为 dark。
 */
export default function useAutoThemeByBeijingTime() {
  const { setTheme } = useTheme();

  useEffect(() => {
    function autoSetTheme() {
      const hour = (new Date().getUTCHours() + 8) % 24;
      setTheme(hour >= 6 && hour < 18 ? 'light' : 'dark');
    }

    function millisecondsUntilNextBoundary() {
      const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const next = new Date(beijingNow);
      const hour = beijingNow.getUTCHours();

      if (hour < 6) next.setUTCHours(6, 0, 0, 0);
      else if (hour < 18) next.setUTCHours(18, 0, 0, 0);
      else {
        next.setUTCDate(next.getUTCDate() + 1);
        next.setUTCHours(6, 0, 0, 0);
      }

      return next.getTime() - beijingNow.getTime();
    }

    let timer: ReturnType<typeof setTimeout>;
    function scheduleNextBoundary() {
      timer = setTimeout(() => {
        autoSetTheme();
        scheduleNextBoundary();
      }, millisecondsUntilNextBoundary());
    }

    autoSetTheme();
    scheduleNextBoundary();
    return () => clearTimeout(timer);
  }, []);
}
