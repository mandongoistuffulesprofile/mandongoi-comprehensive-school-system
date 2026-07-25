import { logger } from './logger';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuits = new Map<string, CircuitState>();

const THRESHOLD = 5;
const TIMEOUT_MS = 30_000;
const HALF_OPEN_MAX = 1;

export async function circuitCall<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  let state = circuits.get(name);
  if (!state) {
    state = { failures: 0, lastFailureTime: 0, state: 'closed' };
    circuits.set(name, state);
  }

  if (state.state === 'open') {
    if (Date.now() - state.lastFailureTime > TIMEOUT_MS) {
      state.state = 'half-open';
      logger.info(`Circuit breaker "${name}" → half-open`);
    } else {
      throw new Error(`Circuit breaker "${name}" is open`);
    }
  }

  try {
    const result = await fn();
    if (state.state === 'half-open') {
      state.state = 'closed';
      state.failures = 0;
      logger.info(`Circuit breaker "${name}" → closed (recovered)`);
    }
    return result;
  } catch (err) {
    state.failures++;
    state.lastFailureTime = Date.now();
    if (state.failures >= THRESHOLD) {
      state.state = 'open';
      logger.warn(`Circuit breaker "${name}" → open (${state.failures} failures)`);
    }
    throw err;
  }
}
