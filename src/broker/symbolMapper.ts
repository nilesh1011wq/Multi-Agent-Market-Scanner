import { BrokerId } from '../types/broker';

export interface BrokerInstrumentDetails {
  epic: string;
  aliases: string[];
  minLot: number;
  step: number;
  multiplier: number;
  description: string;
}

export interface InstrumentDefinition {
  terminalSymbol: string;
  name: string;
  assetClass: 'FOREX' | 'COMMODITY' | 'CRYPTO';
  yahooTicker: string;
  digits: number;
  pipSize: number;
  minSpread: number;
  brokers: Record<BrokerId, BrokerInstrumentDetails>;
}

/**
 * Master mapping specification for all 15 instruments (Forex, Commodities, Cryptos) across Terminal,
 * Capital.com, MetaTrader 5 (MT5/MetaAPI), and IG Markets (REST deal gateway).
 */
export const ALL_INSTRUMENTS: InstrumentDefinition[] = [
  // 1. EURUSD
  {
    terminalSymbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetClass: 'FOREX',
    yahooTicker: 'EURUSD=X',
    digits: 5,
    pipSize: 0.0001,
    minSpread: 0.00008,
    brokers: {
      CAPITAL_COM: {
        epic: 'EURUSD',
        aliases: ['EURUSD', 'EUR/USD'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'EUR/USD Spot CFD',
      },
      MT5: {
        epic: 'EURUSD',
        aliases: ['EURUSD', 'EURUSDm', 'EURUSD.pro', 'EURUSD_i'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'Euro vs US Dollar Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.EURUSD.CFD.IP',
        aliases: ['CS.D.EURUSD.CFD.IP', 'EURUSD', 'CS.D.EURUSD.MINI.IP', 'EUR/USD'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'EUR/USD Standard / Mini Contract (IG Epic: CS.D.EURUSD.CFD.IP)',
      },
    },
  },

  // 2. GBPUSD
  {
    terminalSymbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    assetClass: 'FOREX',
    yahooTicker: 'GBPUSD=X',
    digits: 5,
    pipSize: 0.0001,
    minSpread: 0.00012,
    brokers: {
      CAPITAL_COM: {
        epic: 'GBPUSD',
        aliases: ['GBPUSD', 'GBP/USD'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'GBP/USD Spot CFD',
      },
      MT5: {
        epic: 'GBPUSD',
        aliases: ['GBPUSD', 'GBPUSDm', 'GBPUSD.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'British Pound vs US Dollar Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.GBPUSD.CFD.IP',
        aliases: ['CS.D.GBPUSD.CFD.IP', 'GBPUSD', 'CS.D.GBPUSD.MINI.IP', 'GBP/USD'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'GBP/USD Standard / Mini Contract (IG Epic: CS.D.GBPUSD.CFD.IP)',
      },
    },
  },

  // 3. USDJPY
  {
    terminalSymbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    assetClass: 'FOREX',
    yahooTicker: 'USDJPY=X',
    digits: 3,
    pipSize: 0.01,
    minSpread: 0.012,
    brokers: {
      CAPITAL_COM: {
        epic: 'USDJPY',
        aliases: ['USDJPY', 'USD/JPY'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'USD/JPY Spot CFD',
      },
      MT5: {
        epic: 'USDJPY',
        aliases: ['USDJPY', 'USDJPYm', 'USDJPY.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'US Dollar vs Japanese Yen Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.USDJPY.CFD.IP',
        aliases: ['CS.D.USDJPY.CFD.IP', 'USDJPY', 'CS.D.USDJPY.MINI.IP', 'USD/JPY'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'USD/JPY Standard / Mini Contract (IG Epic: CS.D.USDJPY.CFD.IP)',
      },
    },
  },

  // 4. AUDUSD
  {
    terminalSymbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    assetClass: 'FOREX',
    yahooTicker: 'AUDUSD=X',
    digits: 5,
    pipSize: 0.0001,
    minSpread: 0.00011,
    brokers: {
      CAPITAL_COM: {
        epic: 'AUDUSD',
        aliases: ['AUDUSD', 'AUD/USD'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'AUD/USD Spot CFD',
      },
      MT5: {
        epic: 'AUDUSD',
        aliases: ['AUDUSD', 'AUDUSDm', 'AUDUSD.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'Australian Dollar vs US Dollar Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.AUDUSD.CFD.IP',
        aliases: ['CS.D.AUDUSD.CFD.IP', 'AUDUSD', 'CS.D.AUDUSD.MINI.IP', 'AUD/USD'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'AUD/USD Standard / Mini Contract (IG Epic: CS.D.AUDUSD.CFD.IP)',
      },
    },
  },

  // 5. USDCAD
  {
    terminalSymbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    assetClass: 'FOREX',
    yahooTicker: 'USDCAD=X',
    digits: 5,
    pipSize: 0.0001,
    minSpread: 0.00014,
    brokers: {
      CAPITAL_COM: {
        epic: 'USDCAD',
        aliases: ['USDCAD', 'USD/CAD'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'USD/CAD Spot CFD',
      },
      MT5: {
        epic: 'USDCAD',
        aliases: ['USDCAD', 'USDCADm', 'USDCAD.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'US Dollar vs Canadian Dollar Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.USDCAD.CFD.IP',
        aliases: ['CS.D.USDCAD.CFD.IP', 'USDCAD', 'CS.D.USDCAD.MINI.IP', 'USD/CAD'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'USD/CAD Standard / Mini Contract (IG Epic: CS.D.USDCAD.CFD.IP)',
      },
    },
  },

  // 6. USDCHF
  {
    terminalSymbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    assetClass: 'FOREX',
    yahooTicker: 'USDCHF=X',
    digits: 5,
    pipSize: 0.0001,
    minSpread: 0.00013,
    brokers: {
      CAPITAL_COM: {
        epic: 'USDCHF',
        aliases: ['USDCHF', 'USD/CHF'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'USD/CHF Spot CFD',
      },
      MT5: {
        epic: 'USDCHF',
        aliases: ['USDCHF', 'USDCHFm', 'USDCHF.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'US Dollar vs Swiss Franc Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.USDCHF.CFD.IP',
        aliases: ['CS.D.USDCHF.CFD.IP', 'USDCHF', 'CS.D.USDCHF.MINI.IP', 'USD/CHF'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'USD/CHF Standard / Mini Contract (IG Epic: CS.D.USDCHF.CFD.IP)',
      },
    },
  },

  // 7. NZDUSD
  {
    terminalSymbol: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    assetClass: 'FOREX',
    yahooTicker: 'NZDUSD=X',
    digits: 5,
    pipSize: 0.0001,
    minSpread: 0.00015,
    brokers: {
      CAPITAL_COM: {
        epic: 'NZDUSD',
        aliases: ['NZDUSD', 'NZD/USD'],
        minLot: 100,
        step: 100,
        multiplier: 1,
        description: 'NZD/USD Spot CFD',
      },
      MT5: {
        epic: 'NZDUSD',
        aliases: ['NZDUSD', 'NZDUSDm', 'NZDUSD.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100000,
        description: 'New Zealand Dollar vs US Dollar Standard Lot (100k)',
      },
      IG: {
        epic: 'CS.D.NZDUSD.CFD.IP',
        aliases: ['CS.D.NZDUSD.CFD.IP', 'NZDUSD', 'CS.D.NZDUSD.MINI.IP', 'NZD/USD'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 10000,
        description: 'NZD/USD Standard / Mini Contract (IG Epic: CS.D.NZDUSD.CFD.IP)',
      },
    },
  },

  // 8. XAUUSD (Gold)
  {
    terminalSymbol: 'XAUUSD',
    name: 'Gold Spot / US Dollar',
    assetClass: 'COMMODITY',
    yahooTicker: 'GC=F',
    digits: 2,
    pipSize: 0.01,
    minSpread: 0.25,
    brokers: {
      CAPITAL_COM: {
        epic: 'GOLD',
        aliases: ['GOLD', 'XAUUSD', 'XAU_USD'],
        minLot: 0.1,
        step: 0.1,
        multiplier: 1,
        description: 'Gold Spot Bullion CFD (Capital.com epic: GOLD)',
      },
      MT5: {
        epic: 'XAUUSD',
        aliases: ['XAUUSD', 'GOLD', 'XAUUSDm', 'XAUUSD.pro', 'XAUUSD_i'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100,
        description: 'Gold Spot 100 oz Standard Contract',
      },
      IG: {
        epic: 'CS.D.CFDGOLD.CFD.IP',
        aliases: ['CS.D.CFDGOLD.CFD.IP', 'GOLD', 'XAUUSD', 'CS.D.CFDGOLD.MINI.IP', 'SPOT_GOLD'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 100,
        description: 'Spot Gold $100 / pt Contract (IG Epic: CS.D.CFDGOLD.CFD.IP)',
      },
    },
  },

  // 9. XAGUSD (Silver)
  {
    terminalSymbol: 'XAGUSD',
    name: 'Silver Spot / US Dollar',
    assetClass: 'COMMODITY',
    yahooTicker: 'SI=F',
    digits: 3,
    pipSize: 0.001,
    minSpread: 0.025,
    brokers: {
      CAPITAL_COM: {
        epic: 'SILVER',
        aliases: ['SILVER', 'XAGUSD', 'XAG_USD'],
        minLot: 1,
        step: 1,
        multiplier: 1,
        description: 'Silver Spot Bullion CFD (Capital.com epic: SILVER)',
      },
      MT5: {
        epic: 'XAGUSD',
        aliases: ['XAGUSD', 'SILVER', 'XAGUSDm', 'XAGUSD.pro'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 5000,
        description: 'Silver Spot 5,000 oz Standard Contract',
      },
      IG: {
        epic: 'CS.D.CFDSILVER.CFD.IP',
        aliases: ['CS.D.CFDSILVER.CFD.IP', 'SILVER', 'XAGUSD', 'SPOT_SILVER'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 5000,
        description: 'Spot Silver 5000 oz Contract (IG Epic: CS.D.CFDSILVER.CFD.IP)',
      },
    },
  },

  // 10. WTI (Crude Oil)
  {
    terminalSymbol: 'WTI',
    name: 'Crude Oil WTI Cash',
    assetClass: 'COMMODITY',
    yahooTicker: 'CL=F',
    digits: 2,
    pipSize: 0.01,
    minSpread: 0.03,
    brokers: {
      CAPITAL_COM: {
        epic: 'OIL_CRUDE',
        aliases: ['OIL_CRUDE', 'WTI', 'CRUDE_OIL', 'US_CRUDE'],
        minLot: 1,
        step: 1,
        multiplier: 1,
        description: 'Crude Oil WTI CFD (Capital.com epic: OIL_CRUDE)',
      },
      MT5: {
        epic: 'USOIL',
        aliases: ['USOIL', 'WTI', 'CL', 'USOILm', 'USOIL.pro', 'US_OIL', 'CRUDE'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100,
        description: 'US Crude Oil WTI 100-bbl Contract',
      },
      IG: {
        epic: 'CC.D.CL.USS.IP',
        aliases: ['CC.D.CL.USS.IP', 'OIL_CRUDE', 'WTI', 'USOIL', 'US_LIGHT_CRUDE', 'CS.D.USCASH.CFD.IP'],
        minLot: 1,
        step: 1,
        multiplier: 100,
        description: 'US Crude Oil Light Sweet Cash (IG Epic: CC.D.CL.USS.IP)',
      },
    },
  },

  // 11. BRENT (Brent Crude Oil)
  {
    terminalSymbol: 'BRENT',
    name: 'Brent Crude Oil Cash',
    assetClass: 'COMMODITY',
    yahooTicker: 'BZ=F',
    digits: 2,
    pipSize: 0.01,
    minSpread: 0.035,
    brokers: {
      CAPITAL_COM: {
        epic: 'OIL_BRENT',
        aliases: ['OIL_BRENT', 'BRENT', 'UK_OIL'],
        minLot: 1,
        step: 1,
        multiplier: 1,
        description: 'Brent Oil CFD (Capital.com epic: OIL_BRENT)',
      },
      MT5: {
        epic: 'UKOIL',
        aliases: ['UKOIL', 'BRENT', 'UK_OIL', 'UKOILm', 'UKOIL.pro', 'EB'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 100,
        description: 'UK Brent Crude Oil 100-bbl Contract',
      },
      IG: {
        epic: 'CC.D.LCO.USS.IP',
        aliases: ['CC.D.LCO.USS.IP', 'OIL_BRENT', 'BRENT', 'UKOIL', 'BRENT_CRUDE', 'CS.D.BRENT.CFD.IP'],
        minLot: 1,
        step: 1,
        multiplier: 100,
        description: 'Brent Crude Oil Cash Contract (IG Epic: CC.D.LCO.USS.IP)',
      },
    },
  },

  // 12. NATGAS (Natural Gas)
  {
    terminalSymbol: 'NATGAS',
    name: 'Natural Gas Henry Hub',
    assetClass: 'COMMODITY',
    yahooTicker: 'NG=F',
    digits: 3,
    pipSize: 0.001,
    minSpread: 0.004,
    brokers: {
      CAPITAL_COM: {
        epic: 'NATURALGAS',
        aliases: ['NATURALGAS', 'NATGAS', 'GAS', 'NATGAS_USD'],
        minLot: 10,
        step: 10,
        multiplier: 1,
        description: 'Natural Gas CFD (Capital.com epic: NATURALGAS)',
      },
      MT5: {
        epic: 'NG',
        aliases: ['NG', 'NATGAS', 'XNGUSD', 'NATGASm', 'NG.pro', 'NATURALGAS'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 1000,
        description: 'Natural Gas 1,000 MMBtu Contract',
      },
      IG: {
        epic: 'CC.D.NG.USS.IP',
        aliases: ['CC.D.NG.USS.IP', 'NATGAS', 'NG', 'NATURALGAS', 'GAS_US'],
        minLot: 1,
        step: 1,
        multiplier: 1000,
        description: 'Natural Gas Henry Hub Contract (IG Epic: CC.D.NG.USS.IP)',
      },
    },
  },

  // 13. BTCUSD (Bitcoin)
  {
    terminalSymbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    assetClass: 'CRYPTO',
    yahooTicker: 'BTC-USD',
    digits: 2,
    pipSize: 1.0,
    minSpread: 12.0,
    brokers: {
      CAPITAL_COM: {
        epic: 'BTCUSD',
        aliases: ['BTCUSD', 'BITCOIN', 'BTC/USD', 'BTC'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 1,
        description: 'Bitcoin USD CFD (Capital.com epic: BTCUSD)',
      },
      MT5: {
        epic: 'BTCUSD',
        aliases: ['BTCUSD', 'BTCUSDm', 'BTCUSD.pro', 'BTCUSDT', 'BITCOIN', 'BTC'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 1,
        description: 'Bitcoin vs US Dollar Contract',
      },
      IG: {
        epic: 'CS.D.BITCOIN.CFD.IP',
        aliases: ['CS.D.BITCOIN.CFD.IP', 'BTCUSD', 'BITCOIN', 'CS.D.BITCOIN.MINI.IP', 'BTC'],
        minLot: 0.1,
        step: 0.1,
        multiplier: 1,
        description: 'Bitcoin Crypto CFD (IG Epic: CS.D.BITCOIN.CFD.IP)',
      },
    },
  },

  // 14. ETHUSD (Ethereum)
  {
    terminalSymbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    assetClass: 'CRYPTO',
    yahooTicker: 'ETH-USD',
    digits: 2,
    pipSize: 0.1,
    minSpread: 1.2,
    brokers: {
      CAPITAL_COM: {
        epic: 'ETHUSD',
        aliases: ['ETHUSD', 'ETHEREUM', 'ETH/USD', 'ETH'],
        minLot: 0.1,
        step: 0.1,
        multiplier: 1,
        description: 'Ethereum USD CFD (Capital.com epic: ETHUSD)',
      },
      MT5: {
        epic: 'ETHUSD',
        aliases: ['ETHUSD', 'ETHUSDm', 'ETHUSD.pro', 'ETHUSDT', 'ETHEREUM', 'ETH'],
        minLot: 0.01,
        step: 0.01,
        multiplier: 1,
        description: 'Ethereum vs US Dollar Contract',
      },
      IG: {
        epic: 'CS.D.ETHUSD.CFD.IP',
        aliases: ['CS.D.ETHUSD.CFD.IP', 'ETHUSD', 'ETHEREUM', 'CS.D.ETHUSD.MINI.IP', 'ETH'],
        minLot: 0.5,
        step: 0.1,
        multiplier: 1,
        description: 'Ethereum Crypto CFD (IG Epic: CS.D.ETHUSD.CFD.IP)',
      },
    },
  },

  // 15. SOLUSD (Solana)
  {
    terminalSymbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    assetClass: 'CRYPTO',
    yahooTicker: 'SOL-USD',
    digits: 2,
    pipSize: 0.01,
    minSpread: 0.15,
    brokers: {
      CAPITAL_COM: {
        epic: 'SOLUSD',
        aliases: ['SOLUSD', 'SOLANA', 'SOL/USD', 'SOL'],
        minLot: 1,
        step: 1,
        multiplier: 1,
        description: 'Solana USD CFD (Capital.com epic: SOLUSD)',
      },
      MT5: {
        epic: 'SOLUSD',
        aliases: ['SOLUSD', 'SOLUSDm', 'SOLUSD.pro', 'SOLUSDT', 'SOLANA', 'SOL'],
        minLot: 0.1,
        step: 0.1,
        multiplier: 1,
        description: 'Solana vs US Dollar Contract',
      },
      IG: {
        epic: 'CS.D.SOLUSD.CFD.IP',
        aliases: ['CS.D.SOLUSD.CFD.IP', 'SOLUSD', 'SOLANA', 'SOL'],
        minLot: 1,
        step: 0.5,
        multiplier: 1,
        description: 'Solana Crypto CFD (IG Epic: CS.D.SOLUSD.CFD.IP)',
      },
    },
  },
];

const INSTRUMENT_MAP = new Map<string, InstrumentDefinition>(
  ALL_INSTRUMENTS.map((inst) => [inst.terminalSymbol.toUpperCase(), inst])
);

/**
 * Get the exact broker ticker symbol (epic) for the given terminal symbol and broker.
 */
export function getBrokerSymbol(terminalSymbol: string, brokerId: BrokerId): string {
  const def = INSTRUMENT_MAP.get(terminalSymbol.toUpperCase());
  if (!def) return terminalSymbol;
  return def.brokers[brokerId]?.epic || terminalSymbol;
}

/**
 * Get detailed broker instrument parameters (min lot, step, multiplier, description).
 */
export function getBrokerSymbolDetails(terminalSymbol: string, brokerId: BrokerId): BrokerInstrumentDetails {
  const def = INSTRUMENT_MAP.get(terminalSymbol.toUpperCase());
  if (def && def.brokers[brokerId]) {
    return def.brokers[brokerId];
  }
  return {
    epic: terminalSymbol,
    aliases: [terminalSymbol],
    minLot: 0.01,
    step: 0.01,
    multiplier: 1,
    description: terminalSymbol,
  };
}

/**
 * Get the full Instrument Definition.
 */
export function getInstrumentDefinition(terminalSymbol: string): InstrumentDefinition | undefined {
  return INSTRUMENT_MAP.get(terminalSymbol.toUpperCase());
}

/**
 * Get all 12 mapped instrument definitions.
 */
export function getAllInstrumentMappings(): InstrumentDefinition[] {
  return ALL_INSTRUMENTS;
}

/**
 * Reverse mapping: from broker epic or alias back to terminal symbol.
 */
export function getTerminalSymbolFromBroker(brokerEpic: string, brokerId?: BrokerId): string {
  if (!brokerEpic) return 'EURUSD';
  const cleanEpic = brokerEpic.trim().toUpperCase().replace(/[\s\/\-_.]/g, '');

  // Direct fast mappings for Capital.com common instrument names
  if (cleanEpic.includes('BRENTOIL') || cleanEpic === 'OILBRENT' || cleanEpic.includes('BRENTCRUDE')) return 'BRENT';
  if (cleanEpic.includes('CRUDEOIL') || cleanEpic === 'OILCRUDE' || cleanEpic === 'USCRUDE' || cleanEpic === 'USOIL') return 'WTI';
  if (cleanEpic.includes('BITCOIN') || cleanEpic === 'BTC' || cleanEpic.startsWith('BTCUSD')) return 'BTCUSD';
  if (cleanEpic.includes('ETHEREUM') || cleanEpic === 'ETH' || cleanEpic.startsWith('ETHUSD')) return 'ETHUSD';
  if (cleanEpic.includes('SOLANA') || cleanEpic === 'SOL' || cleanEpic.startsWith('SOLUSD')) return 'SOLUSD';
  if (cleanEpic.includes('GOLD') || cleanEpic.startsWith('XAU')) return 'XAUUSD';
  if (cleanEpic.includes('SILVER') || cleanEpic.startsWith('XAG')) return 'XAGUSD';
  if (cleanEpic.includes('NATURALGAS') || cleanEpic.includes('NATGAS')) return 'NATGAS';

  for (const inst of ALL_INSTRUMENTS) {
    // Check terminal symbol directly
    if (inst.terminalSymbol.toUpperCase().replace(/[\s\/\-_.]/g, '') === cleanEpic) {
      return inst.terminalSymbol;
    }

    // Check specific broker if provided
    if (brokerId && inst.brokers[brokerId]) {
      const brokerInfo = inst.brokers[brokerId];
      if (brokerInfo.epic.toUpperCase().replace(/[\s\/\-_.]/g, '') === cleanEpic) {
        return inst.terminalSymbol;
      }
      for (const alias of brokerInfo.aliases) {
        if (alias.toUpperCase().replace(/[\s\/\-_.]/g, '') === cleanEpic) {
          return inst.terminalSymbol;
        }
      }
    } else {
      // Check across all brokers
      for (const b of Object.values(inst.brokers)) {
        if (b.epic.toUpperCase().replace(/[\s\/\-_.]/g, '') === cleanEpic) {
          return inst.terminalSymbol;
        }
        for (const alias of b.aliases) {
          if (alias.toUpperCase().replace(/[\s\/\-_.]/g, '') === cleanEpic) {
            return inst.terminalSymbol;
          }
        }
      }
    }
  }

  return brokerEpic;
}

/**
 * Returns the USD conversion factor per 1 point of price movement for a given symbol and price.
 * For pairs where USD is the base currency (USDJPY, USDCAD, USDCHF), 1 unit of quote currency = 1 / price USD.
 */
export function getUsdValuePerPoint(terminalSymbol: string, referencePrice: number): number {
  const sym = terminalSymbol.toUpperCase();
  if ((sym === 'USDJPY' || sym === 'USDCAD' || sym === 'USDCHF') && referencePrice > 0) {
    return 1 / referencePrice;
  }
  return 1;
}

/**
 * Calculates correct broker lot size or discrete contract units based on broker sizing rules
 * and exact percentage of risk capital.
 * Note: riskPercent can be passed either as decimal (e.g. 0.01 for 1%) or percentage (e.g. 1.0 for 1%).
 */
export function calculateBrokerLotSize(
  terminalSymbol: string,
  brokerId: BrokerId,
  accountBalance: number,
  riskPercent: number = 0.01, // 0.01 (1%) or 1.0 (1%)
  riskDistanceInPrice: number = 0.0050,
  entryPrice?: number
): number {
  const details = getBrokerSymbolDetails(terminalSymbol, brokerId);
  // Normalize riskPercent: if > 0.15, treat as percentage (e.g. 1.0 -> 0.01), else decimal (0.01 -> 0.01)
  const normalizedRiskFraction = riskPercent > 0.15 ? riskPercent / 100 : riskPercent;
  const riskUsd = Math.max(0, accountBalance * normalizedRiskFraction);

  if (riskDistanceInPrice <= 0 || riskUsd <= 0) return details.minLot;

  const refPrice = entryPrice && entryPrice > 0 ? entryPrice : (terminalSymbol.toUpperCase() === 'USDJPY' ? 152 : 1);
  const usdPerPoint = getUsdValuePerPoint(terminalSymbol, refPrice);
  const effectiveMultiplier = (details.multiplier || 1) * usdPerPoint;

  const rawUnits = riskUsd / (riskDistanceInPrice * effectiveMultiplier);
  const step = details.step || 0.01;
  const stepped = Math.floor(rawUnits / step) * step;

  let maxUnits = 500000;
  if (brokerId === 'MT5') maxUnits = 50;
  else if (brokerId === 'IG') maxUnits = 500;

  const clamped = Math.max(details.minLot, Math.min(maxUnits, stepped));
  return Number(clamped.toFixed(4));
}

export interface RiskOrderMetrics {
  units: number;
  riskPct: number;
  riskCapitalUsd: number;
  effectiveRiskUsd: number;
  effectiveRiskPct: number;
  stopDistance: number;
  rewardDistance: number;
  riskRewardRatio: number;
  spreadPadding: number;
  minLot: number;
  step: number;
  multiplier: number;
}

/**
 * Full institutional Risk-Percentage Position Sizing calculator used across OrderTicketModal and BrokerManager.
 * @param riskPct Risk percentage of equity (e.g. 1.0 = 1.0% of account equity)
 */
export function calculateRiskBasedOrderMetrics(
  terminalSymbol: string,
  brokerId: BrokerId,
  accountEquity: number,
  riskPct: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit?: number
): RiskOrderMetrics {
  const def = getInstrumentDefinition(terminalSymbol);
  const details = getBrokerSymbolDetails(terminalSymbol, brokerId);
  const safeEquity = Math.max(100, accountEquity || 10000);
  const cleanRiskPct = Math.max(0.1, Math.min(10, riskPct || 1.0));
  const riskCapitalUsd = Number(((safeEquity * cleanRiskPct) / 100).toFixed(2));

  const stopDistance = Math.abs(entryPrice - stopLoss);
  const rewardDistance = takeProfit ? Math.abs(takeProfit - entryPrice) : stopDistance * 2;
  const riskRewardRatio = stopDistance > 0 ? Number((rewardDistance / stopDistance).toFixed(2)) : 2.0;
  const spreadPadding = Number(((def?.minSpread || 0.0001) * 1.5).toFixed(def?.digits || 5));

  const units = calculateBrokerLotSize(
    terminalSymbol,
    brokerId,
    safeEquity,
    cleanRiskPct / 100,
    stopDistance,
    entryPrice
  );

  const usdPerPoint = getUsdValuePerPoint(terminalSymbol, entryPrice);
  const effectiveRiskUsd = Number(
    (units * stopDistance * (details.multiplier || 1) * usdPerPoint).toFixed(2)
  );
  const effectiveRiskPct = Number(((effectiveRiskUsd / safeEquity) * 100).toFixed(2));

  return {
    units,
    riskPct: cleanRiskPct,
    riskCapitalUsd,
    effectiveRiskUsd,
    effectiveRiskPct,
    stopDistance,
    rewardDistance,
    riskRewardRatio,
    spreadPadding,
    minLot: details.minLot,
    step: details.step,
    multiplier: details.multiplier,
  };
}

/**
 * Accurate unrealized/realized PnL ($ and R-multiple) calculator for any broker position.
 */
export function calculatePositionPnL(
  terminalSymbol: string,
  brokerId: BrokerId,
  direction: 'BUY' | 'SELL',
  units: number,
  openPrice: number,
  currentPrice: number,
  stopLoss: number
): { pnlUsd: number; pnlR: number } {
  const details = getBrokerSymbolDetails(terminalSymbol, brokerId);
  const priceDiff = direction === 'BUY' ? currentPrice - openPrice : openPrice - currentPrice;
  const usdPerPoint = getUsdValuePerPoint(terminalSymbol, currentPrice || openPrice);
  const pnlUsd = Number((priceDiff * units * (details.multiplier || 1) * usdPerPoint).toFixed(2));

  const initialRiskDist = Math.abs(openPrice - stopLoss);
  // If SL was moved to breakeven (distance ~ 0), fall back to 0.5% of openPrice as 1R reference
  const effectiveRiskDist =
    initialRiskDist > openPrice * 0.0002 ? initialRiskDist : openPrice * 0.005;
  const pnlR = effectiveRiskDist > 0 ? Number((priceDiff / effectiveRiskDist).toFixed(2)) : 0;

  return { pnlUsd, pnlR };
}

/**
 * Checks whether two instruments share directional currency or asset-class correlation.
 */
export function areInstrumentsCorrelated(
  symA: string,
  dirA: 'BUY' | 'SELL',
  symB: string,
  dirB: 'BUY' | 'SELL'
): boolean {
  const a = symA.toUpperCase();
  const b = symB.toUpperCase();
  if (a === b) return dirA === dirB;

  const defA = getInstrumentDefinition(a);
  const defB = getInstrumentDefinition(b);

  // Crypto assets move together directionally
  if (defA?.assetClass === 'CRYPTO' && defB?.assetClass === 'CRYPTO') {
    return dirA === dirB;
  }
  // Precious metals move together
  if ((a === 'XAUUSD' || a === 'XAGUSD') && (b === 'XAUUSD' || b === 'XAGUSD')) {
    return dirA === dirB;
  }
  // Crude oil benchmarks move together
  if ((a === 'WTI' || a === 'BRENT') && (b === 'WTI' || b === 'BRENT')) {
    return dirA === dirB;
  }
  // Forex USD directional exposure check
  if (defA?.assetClass === 'FOREX' && defB?.assetClass === 'FOREX') {
    const usdLongA = (a.startsWith('USD') && dirA === 'BUY') || (a.endsWith('USD') && dirA === 'SELL');
    const usdLongB = (b.startsWith('USD') && dirB === 'BUY') || (b.endsWith('USD') && dirB === 'SELL');
    return usdLongA === usdLongB;
  }
  return false;
}

