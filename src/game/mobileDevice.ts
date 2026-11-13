export interface MobileDetectionInput {
  userAgent: string;
  maxTouchPoints: number;
  coarsePointer: boolean;
  width: number;
  height: number;
}

export interface MobileEnvironmentState {
  isTouchDevice: boolean;
  isPhoneSize: boolean;
  isMobile: boolean;
  isLandscape: boolean;
}

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function detectMobileEnvironment(input: MobileDetectionInput): MobileEnvironmentState {
  const isTouchDevice =
    MOBILE_UA_REGEX.test(input.userAgent) ||
    input.maxTouchPoints > 0 ||
    input.coarsePointer;
  const isPhoneSize = input.width <= 920 || input.height <= 520;
  const isMobile = isTouchDevice || isPhoneSize;
  const isLandscape = input.width > input.height;

  return {
    isTouchDevice,
    isPhoneSize,
    isMobile,
    isLandscape,
  };
}
