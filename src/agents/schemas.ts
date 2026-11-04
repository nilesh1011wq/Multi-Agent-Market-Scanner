import { BaseAgentOutput } from '../types/debate';

/**
 * Validates that an object conforms strictly to the BaseAgentOutput schema.
 */
export function validateAgentOutput(data: any): { valid: boolean; errors: string[]; output?: BaseAgentOutput } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Output is not a valid JSON object'] };
  }

  if (typeof data.agent !== 'string') errors.push('Missing or invalid "agent"');
  if (typeof data.symbol !== 'string') errors.push('Missing or invalid "symbol"');
  if (!['BUY', 'SELL', 'NEUTRAL'].includes(data.direction)) {
    errors.push(`Invalid "direction": ${data.direction}. Must be BUY, SELL, or NEUTRAL.`);
  }

  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100) {
    errors.push(`Invalid "confidence": ${data.confidence}. Must be integer/number between 0 and 100.`);
  }

  if (!data.timeframe_bias || typeof data.timeframe_bias !== 'object') {
    errors.push('Missing "timeframe_bias" object');
  } else {
    for (const tf of ['W1', 'D1', 'H4', 'H1', 'M15']) {
      if (typeof data.timeframe_bias[tf] !== 'string') {
        errors.push(`Missing timeframe bias for ${tf}`);
      }
    }
  }

  if (!data.key_levels || !Array.isArray(data.key_levels.support) || !Array.isArray(data.key_levels.resistance)) {
    errors.push('Missing or invalid "key_levels" { support: [], resistance: [] }');
  }

  if (typeof data.reasoning !== 'string' || data.reasoning.trim().length === 0) {
    errors.push('Missing or empty "reasoning" string');
  }

  if (!Array.isArray(data.evidence)) {
    errors.push('"evidence" must be an array of evidence citations');
  } else {
    for (let i = 0; i < data.evidence.length; i++) {
      const ev = data.evidence[i];
      if (!ev || !['analog', 'kb_doc', 'snapshot'].includes(ev.source)) {
        errors.push(`evidence[${i}] has invalid source: ${ev?.source}`);
      }
      if (typeof ev.claim !== 'string') {
        errors.push(`evidence[${i}] missing claim string`);
      }
    }
  }

  if (typeof data.invalidation_level !== 'number') {
    errors.push('Missing or invalid numeric "invalidation_level"');
  }

  if (!Array.isArray(data.risks)) errors.push('"risks" must be an array of strings');
  if (!Array.isArray(data.data_gaps)) errors.push('"data_gaps" must be an array of strings');

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], output: data as BaseAgentOutput };
}
