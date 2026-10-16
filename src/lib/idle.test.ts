import { describe, expect, it } from 'vitest';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, idleState } from './idle';

describe('idleState', () => {
  it('por defecto la sesión dura 15 minutos', () => {
    expect(IDLE_TIMEOUT_MS).toBe(15 * 60 * 1000);
  });

  it('avisa durante el último minuto y expira al llegar al tope', () => {
    expect(idleState(0)).toBe('active');
    expect(idleState(IDLE_TIMEOUT_MS - IDLE_WARNING_MS - 1)).toBe('active');
    expect(idleState(IDLE_TIMEOUT_MS - IDLE_WARNING_MS)).toBe('warning');
    expect(idleState(IDLE_TIMEOUT_MS - 1)).toBe('warning');
    expect(idleState(IDLE_TIMEOUT_MS)).toBe('expired');
    expect(idleState(IDLE_TIMEOUT_MS * 4)).toBe('expired');
  });
});
