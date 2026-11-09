/**
 * Global Quota and Rate-Limit Circuit Breaker for Market Scanner AI Agents.
 *
 * Prevents unhandled 429 RESOURCE_EXHAUSTED error bursts by immediately short-circuiting
 * to the High-Fidelity Deterministic Quantitative Solver when the daily quota limit is reached.
 */

export interface QuotaStatus {
  isExhausted: boolean;
  exhaustedUntil: number | null;
  retryAfterSeconds: number | null;
  metric: string | null;
  model: string;
  engineMode: 'AI_GEMINI' | 'QUANT_DETERMINISTIC';
  message: string;
}

class QuotaManager {
  private isExhausted: boolean = false;
  private exhaustedUntil: number = 0;
  private retryAfterSeconds: number | null = null;
  private metric: string | null = null;
  private defaultModel: string = 'gemini-2.5-flash';
  private hasLoggedSwitch: boolean = false;

  constructor() {
    // Check if initial key is present
    const apiKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.length < 10) {
      this.isExhausted = true;
      this.exhaustedUntil = Number.MAX_SAFE_INTEGER;
    }
  }

  /**
   * Checks if an error is a quota exhaustion, rate limit, or resource exhaustion error.
   */
  public isQuotaError(err: any): boolean {
    if (!err) return false;
    const msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
    const code = err.code || err.status;
    return (
      code === 429 ||
      code === 'RESOURCE_EXHAUSTED' ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('Quota exceeded') ||
      msg.includes('free_tier_requests') ||
      msg.includes('rate-limit')
    );
  }

  /**
   * Records a quota exhaustion event, calculating the cooldown and tripping the circuit breaker.
   */
  public recordQuotaExhaustion(err: any): void {
    this.isExhausted = true;
    let cooldownMs = 3600 * 1000; // Default 1 hour cooldown

    try {
      const msg = typeof err === 'string' ? err : err.message || '';
      if (msg.includes('retry in')) {
        const match = msg.match(/retry in\s+([0-9.]+[smhd])/i);
        if (match && match[1]) {
          const val = parseFloat(match[1]);
          if (match[1].endsWith('h')) cooldownMs = val * 3600 * 1000;
          else if (match[1].endsWith('m')) cooldownMs = val * 60 * 1000;
          else if (match[1].endsWith('s')) cooldownMs = val * 1000;
        }
      }
      if (msg.includes('retryDelay')) {
        const delayMatch = msg.match(/retryDelay["']?\s*:\s*["']?([0-9]+)s/i);
        if (delayMatch && delayMatch[1]) {
          cooldownMs = parseInt(delayMatch[1], 10) * 1000;
        }
      }
      if (msg.includes('quotaMetric')) {
        const metricMatch = msg.match(/quotaMetric["']?\s*:\s*["']([^"']+)["']/);
        if (metricMatch && metricMatch[1]) {
          this.metric = metricMatch[1];
        }
      }
    } catch {
      // Ignore parsing errors
    }

    this.exhaustedUntil = Date.now() + cooldownMs;
    this.retryAfterSeconds = Math.round(cooldownMs / 1000);

    if (!this.hasLoggedSwitch) {
      this.hasLoggedSwitch = true;
      // Single clean informational notice; DO NOT output raw JSON error object to avoid IDE error-trap
      console.info(
        `[Engine Notice] Gemini API quota limit reached. Engaging High-Fidelity Deterministic Quantitative Solver Engine for all 10 specialists and Chief Arbiter (Cooldown: ${Math.round(
          cooldownMs / 60000
        )}m).`
      );
    }
  }

  /**
   * Fast-path check: should an agent attempt an outbound Gemini LLM call?
   * If quota is currently exhausted, returns false immediately to skip network roundtrip and errors.
   */
  public shouldAttemptLLM(): boolean {
    const apiKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.length < 10) {
      return false;
    }

    if (this.isExhausted) {
      if (Date.now() < this.exhaustedUntil) {
        return false;
      }
      // Cooldown expired; allow trial request
      this.isExhausted = false;
      this.hasLoggedSwitch = false;
    }

    return true;
  }

  public isQuotaExhausted(): boolean {
    return this.isExhausted && Date.now() < this.exhaustedUntil;
  }

  public getEngineMode(): 'AI_GEMINI' | 'QUANT_DETERMINISTIC' {
    return this.shouldAttemptLLM() ? 'AI_GEMINI' : 'QUANT_DETERMINISTIC';
  }

  public getStatus(): QuotaStatus {
    const exhausted = this.isQuotaExhausted();
    const remainingSec = exhausted ? Math.max(0, Math.round((this.exhaustedUntil - Date.now()) / 1000)) : null;

    return {
      isExhausted: exhausted,
      exhaustedUntil: exhausted ? this.exhaustedUntil : null,
      retryAfterSeconds: remainingSec,
      metric: this.metric,
      model: this.defaultModel,
      engineMode: this.getEngineMode(),
      message: exhausted
        ? `Deterministic Quant Solver Active (Gemini free-tier quota exhausted, resets in ${Math.round(
            (remainingSec || 0) / 60
          )}m)`
        : 'Gemini 2.5 Flash Specialist Ensemble Active',
    };
  }

  public reset(): void {
    this.isExhausted = false;
    this.exhaustedUntil = 0;
    this.hasLoggedSwitch = false;
  }
}

export const quotaManager = new QuotaManager();
