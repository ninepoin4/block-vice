import { useCallback, useEffect, useState } from 'react';
import { detectMobileEnvironment, MobileEnvironmentState } from '../game/mobileDevice';

function readCurrentEnv(): MobileEnvironmentState {
  if (typeof window === 'undefined') {
    return {
      isTouchDevice: false,
      isPhoneSize: false,
      isMobile: false,
      isLandscape: true,
    };
  }
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return detectMobileEnvironment({
    userAgent: navigator.userAgent || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    coarsePointer,
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

function readFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  return Boolean(
    document.fullscreenEnabled ||
      typeof el.requestFullscreen === 'function' ||
      typeof el.webkitRequestFullscreen === 'function'
  );
}

function readIsFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export function useMobileDevice() {
  const [env, setEnv] = useState<MobileEnvironmentState>(readCurrentEnv);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(readIsFullscreen);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => {
      setEnv(readCurrentEnv());
    };
    const onFsChange = () => {
      setIsFullscreen(readIsFullscreen());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as EventListener);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as EventListener);
    };
  }, []);

  const requestFullscreen = useCallback(async () => {
    setFullscreenError(null);
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    try {
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
      } else if (typeof el.webkitRequestFullscreen === 'function') {
        await el.webkitRequestFullscreen();
      } else {
        setFullscreenError('当前浏览器限制了网页全屏接口，建议使用全屏浏览或添加到主屏幕');
        return false;
      }
      setIsFullscreen(true);
      return true;
    } catch {
      setFullscreenError('系统或浏览器阻止了自动全屏，可继续直接游玩');
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    try {
      if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function' && doc.webkitFullscreenElement) {
        await doc.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } catch {
      // Ignore browser exit rejections
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (readIsFullscreen()) {
      void exitFullscreen();
    } else {
      void requestFullscreen();
    }
  }, [exitFullscreen, requestFullscreen]);

  const fullscreenSupported = readFullscreenSupported();
  const showFullscreenPrompt = env.isMobile && !isFullscreen && !promptDismissed;

  return {
    ...env,
    isFullscreen,
    fullscreenSupported,
    fullscreenError,
    showFullscreenPrompt,
    dismissFullscreenPrompt: () => setPromptDismissed(true),
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
