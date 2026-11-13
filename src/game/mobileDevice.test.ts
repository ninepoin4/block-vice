import assert from 'node:assert/strict';
import test from 'node:test';
import { detectMobileEnvironment } from './mobileDevice';

test('detects mobile portrait phone screen and enables touch/mobile mode', () => {
  const res = detectMobileEnvironment({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    maxTouchPoints: 5,
    coarsePointer: true,
    width: 390,
    height: 844,
  });

  assert.equal(res.isTouchDevice, true);
  assert.equal(res.isPhoneSize, true);
  assert.equal(res.isMobile, true);
  assert.equal(res.isLandscape, false);
});

test('detects landscape phone screen as mobile landscape', () => {
  const res = detectMobileEnvironment({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36',
    maxTouchPoints: 5,
    coarsePointer: true,
    width: 844,
    height: 390,
  });

  assert.equal(res.isPhoneSize, true);
  assert.equal(res.isMobile, true);
  assert.equal(res.isLandscape, true);
});

test('detects small browser viewport on desktop as phone-size mobile layout', () => {
  const res = detectMobileEnvironment({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/125.0.0.0',
    maxTouchPoints: 0,
    coarsePointer: false,
    width: 412,
    height: 915,
  });

  assert.equal(res.isTouchDevice, false);
  assert.equal(res.isPhoneSize, true);
  assert.equal(res.isMobile, true);
});

test('keeps desktop 1440x900 out of mobile mode', () => {
  const res = detectMobileEnvironment({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
    maxTouchPoints: 0,
    coarsePointer: false,
    width: 1440,
    height: 900,
  });

  assert.equal(res.isTouchDevice, false);
  assert.equal(res.isPhoneSize, false);
  assert.equal(res.isMobile, false);
  assert.equal(res.isLandscape, true);
});
