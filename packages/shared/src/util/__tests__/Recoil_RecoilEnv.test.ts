/**
 * TypeScript port of Recoil_RecoilEnv-test.js
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import RecoilEnv from '../Recoil_RecoilEnv';
import gkx from '../Recoil_gkx';

describe('RecoilEnv', () => {
  test('environment propagates GKs', () => {
    expect(gkx('recoil_test_gk')).toBe(false);
    RecoilEnv.RECOIL_GKS_ENABLED.add('recoil_test_gk');
    expect(gkx('recoil_test_gk')).toBe(true);
  });

  describe('support for process.env.RECOIL_GKS_ENABLED', () => {
    const originalProcessEnv = process.env;
    beforeEach(() => {
      process.env = { ...originalProcessEnv };
      process.env.RECOIL_GKS_ENABLED =
        'recoil_test_gk1,recoil_test_gk2 recoil_test_gk3';
      vi.resetModules();
    });

    afterEach(() => {
      process.env = originalProcessEnv;
    });

    test('environment propagates GKs from process.env', async () => {
      // Re-import after setting environment
      vi.resetModules();
      const { default: gkxFresh } = await import('../Recoil_gkx');

      expect(gkxFresh('recoil_test_gk1')).toBe(true);
      expect(gkxFresh('recoil_test_gk2')).toBe(true);
      expect(gkxFresh('recoil_test_gk3')).toBe(true);
    });
  });
}); 