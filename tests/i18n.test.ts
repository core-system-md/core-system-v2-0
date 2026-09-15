import { afterEach, describe, expect, it } from 'vitest';
import {
  LANGUAGE_DIRECTIONS,
  getAppDirection,
  getAppLanguage,
  getAppLocale,
  setAppLanguage,
} from '../src/i18n';

describe('i18n foundation', () => {
  afterEach(async () => {
    await setAppLanguage('ar');
  });

  it('uses Arabic as the default direction and locale', () => {
    expect(LANGUAGE_DIRECTIONS.ar).toBe('rtl');
    expect(LANGUAGE_DIRECTIONS.en).toBe('ltr');
    expect(getAppLanguage()).toBe('ar');
    expect(getAppDirection()).toBe('rtl');
    expect(getAppLocale()).toBe('ar-JO');
  });

  it('switches between Arabic and English deterministically', async () => {
    await setAppLanguage('en');
    expect(getAppLanguage()).toBe('en');
    expect(getAppDirection()).toBe('ltr');
    expect(getAppLocale()).toBe('en-US');

    await setAppLanguage('ar');
    expect(getAppLanguage()).toBe('ar');
    expect(getAppDirection()).toBe('rtl');
    expect(getAppLocale()).toBe('ar-JO');
  });
});
