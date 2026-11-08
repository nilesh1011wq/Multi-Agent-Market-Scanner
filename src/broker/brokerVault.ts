import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { BrokerConfig, BrokerId } from '../types/broker';

const VAULT_FILE = path.resolve(process.cwd(), '.broker_vault.enc');
const MASTER_KEY_ENV = process.env.BROKER_VAULT_KEY || 'quant-terminal-institutional-broker-vault-secret-key-2026';
const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a 32-byte key from the master secret
 */
function getDerivedKey(): Buffer {
  return crypto.scryptSync(MASTER_KEY_ENV, 'broker-salt-salt', 32);
}

/**
 * Encrypts an object into a serialized base64 string
 */
function encryptData(data: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv);
  const plaintext = JSON.stringify(data);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    content: encrypted,
  });
}

/**
 * Decrypts a serialized payload
 */
function decryptData(encryptedStr: string): any {
  try {
    const parsed = JSON.parse(encryptedStr);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getDerivedKey(),
      Buffer.from(parsed.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));
    let decrypted = decipher.update(parsed.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.warn('[BrokerVault] Decryption fallback or key mismatch:', err);
    return null;
  }
}

/**
 * Default empty configs for each supported broker
 */
export function getDefaultBrokerConfigs(): Record<BrokerId, BrokerConfig> {
  return {
    CAPITAL_COM: {
      id: 'CAPITAL_COM',
      name: 'Capital.com',
      environment: 'DEMO',
      apiKey: '',
      apiSecret: '',
      identifier: '',
      isActive: true,
      isAutoExecutionEnabled: true,
      status: 'DISCONNECTED',
    },
    MT5: {
      id: 'MT5',
      name: 'MetaTrader 5 (MetaAPI)',
      environment: 'DEMO',
      apiKey: '',
      accountId: '',
      serverName: 'MetaQuotes-Demo',
      isActive: false,
      isAutoExecutionEnabled: false,
      status: 'DISCONNECTED',
    },
    IG: {
      id: 'IG',
      name: 'IG Markets',
      environment: 'DEMO',
      apiKey: '',
      apiSecret: '',
      identifier: '',
      accountId: '',
      isActive: false,
      isAutoExecutionEnabled: false,
      status: 'DISCONNECTED',
    },
  };
}

export class BrokerVault {
  private configs: Record<BrokerId, BrokerConfig>;

  constructor() {
    this.configs = this.loadVault();
  }

  private loadVault(): Record<BrokerId, BrokerConfig> {
    const defaults = getDefaultBrokerConfigs();
    if (fs.existsSync(VAULT_FILE)) {
      try {
        const fileContent = fs.readFileSync(VAULT_FILE, 'utf8');
        const decrypted = decryptData(fileContent);
        if (decrypted && typeof decrypted === 'object') {
          const loaded = { ...defaults, ...decrypted };
          // Remove legacy OANDA key if present in decrypted vault
          if ('OANDA' in loaded) {
            delete (loaded as any).OANDA;
          }
          return loaded;
        }
      } catch (err: any) {
        console.error('[BrokerVault] Failed to load encrypted vault:', err.message);
      }
    }
    return defaults;
  }

  public saveVault(): void {
    try {
      const encrypted = encryptData(this.configs);
      fs.writeFileSync(VAULT_FILE, encrypted, 'utf8');
    } catch (err: any) {
      console.error('[BrokerVault] Failed to save encrypted vault:', err.message);
    }
  }

  public getAllConfigs(): Record<BrokerId, BrokerConfig> {
    return { ...this.configs };
  }

  public getConfig(id: BrokerId): BrokerConfig {
    return this.configs[id] || getDefaultBrokerConfigs()[id];
  }

  public updateConfig(id: BrokerId, partial: Partial<BrokerConfig>): BrokerConfig {
    const existing = this.configs[id] || getDefaultBrokerConfigs()[id];

    // Protect existing secrets: if frontend submits masked bullet string or empty string when existing secret exists, keep existing
    const cleanPartial = { ...partial };
    if (cleanPartial.apiKey !== undefined) {
      if (cleanPartial.apiKey.includes('••••') || (cleanPartial.apiKey.trim() === '' && Boolean(existing.apiKey))) {
        delete cleanPartial.apiKey;
      } else {
        cleanPartial.apiKey = cleanPartial.apiKey.trim();
      }
    }
    if (cleanPartial.apiSecret !== undefined) {
      if (cleanPartial.apiSecret.includes('••••') || (cleanPartial.apiSecret.trim() === '' && Boolean(existing.apiSecret))) {
        delete cleanPartial.apiSecret;
      } else {
        cleanPartial.apiSecret = cleanPartial.apiSecret.trim();
      }
    }
    if (cleanPartial.identifier !== undefined) {
      if (cleanPartial.identifier.trim() === '' && Boolean(existing.identifier)) {
        delete cleanPartial.identifier;
      } else {
        cleanPartial.identifier = cleanPartial.identifier.trim();
      }
    }

    this.configs[id] = {
      ...existing,
      ...cleanPartial,
      id,
    };
    this.saveVault();
    return this.configs[id];
  }

  public setActiveBroker(id: BrokerId): void {
    for (const key of Object.keys(this.configs) as BrokerId[]) {
      this.configs[key].isActive = key === id;
    }
    this.saveVault();
  }

  public getActiveBroker(): BrokerConfig {
    const active = Object.values(this.configs).find((c) => c.isActive);
    return active || this.configs.CAPITAL_COM;
  }

  /**
   * Sanitizes configs for safe frontend display (masks passwords/keys except last 4 chars)
   */
  public getSanitizedConfigs(): Record<BrokerId, BrokerConfig> {
    const sanitized: Record<BrokerId, BrokerConfig> = {} as any;
    for (const [key, conf] of Object.entries(this.configs) as [BrokerId, BrokerConfig][]) {
      sanitized[key] = {
        ...conf,
        apiKey: conf.apiKey ? `••••••••${conf.apiKey.slice(-4)}` : '',
        apiSecret: conf.apiSecret ? '••••••••' : '',
        hasSavedApiKey: Boolean(conf.apiKey && conf.apiKey.length > 5 && !conf.apiKey.includes('••••')),
        hasSavedApiSecret: Boolean(conf.apiSecret && conf.apiSecret.length > 3 && !conf.apiSecret.includes('••••')),
        hasSavedIdentifier: Boolean(conf.identifier && conf.identifier.length > 3),
      };
    }
    return sanitized;
  }
}

export const brokerVault = new BrokerVault();
