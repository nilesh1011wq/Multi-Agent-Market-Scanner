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
  assetClass: 'FOREX' | 'COMMODITY';
  yahooTicker: string;
  digits: number;
  pipSize: number;
  minSpread: number;
  brokers: Record<BrokerId, BrokerInstrumentDetails>;
}

/**
 * Master mapping specification for all 12 instruments across Terminal,
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
  const cleanEpic = brokerEpic.trim().toUpperCase().replace(/[\/\-_.]/g, '');

  for (const inst of ALL_INSTRUMENTS) {
    // Check terminal symbol directly
    if (inst.terminalSymbol.toUpperCase().replace(/[\/\-_.]/g, '') === cleanEpic) {
      return inst.terminalSymbol;
    }

    // Check specific broker if provided
    if (brokerId && inst.brokers[brokerId]) {
      const brokerInfo = inst.brokers[brokerId];
      if (brokerInfo.epic.toUpperCase().replace(/[\/\-_.]/g, '') === cleanEpic) {
        return inst.terminalSymbol;
      }
      for (const alias of brokerInfo.aliases) {
        if (alias.toUpperCase().replace(/[\/\-_.]/g, '') === cleanEpic) {
          return inst.terminalSymbol;
        }
      }
    } else {
      // Check across all brokers
      for (const b of Object.values(inst.brokers)) {
        if (b.epic.toUpperCase().replace(/[\/\-_.]/g, '') === cleanEpic) {
          return inst.terminalSymbol;
        }
        for (const alias of b.aliases) {
          if (alias.toUpperCase().replace(/[\/\-_.]/g, '') === cleanEpic) {
            return inst.terminalSymbol;
          }
        }
      }
    }
  }

  return brokerEpic;
}

/**
 * Calculates correct broker lot size or discrete contract units based on broker sizing rules.
 */
export function calculateBrokerLotSize(
  terminalSymbol: string,
  brokerId: BrokerId,
  accountBalance: number,
  riskPercent: number = 0.01, // 1% risk
  riskDistanceInPrice: number = 0.0050
): number {
  const details = getBrokerSymbolDetails(terminalSymbol, brokerId);
  const riskUsd = accountBalance * riskPercent;

  if (riskDistanceInPrice <= 0) return details.minLot;

  let calculatedUnits = 0;

  if (brokerId === 'MT5') {
    // Standard MT5 lot calculation: Lot = Risk / (Distance * ContractMultiplier)
    const rawLots = riskUsd / (riskDistanceInPrice * details.multiplier);
    const stepped = Math.floor(rawLots / details.step) * details.step;
    calculatedUnits = Math.max(details.minLot, Math.min(10, Math.round(stepped * 100) / 100));
  } else if (brokerId === 'IG') {
    // IG Markets uses standard / mini CFD contract sizes
    const rawContracts = riskUsd / (riskDistanceInPrice * (details.multiplier || 1));
    const stepped = Math.floor(rawContracts / details.step) * details.step;
    calculatedUnits = Math.max(details.minLot, Math.min(100, Math.round(stepped * 10) / 10));
  } else {
    // Capital.com uses contracts/shares
    const rawContracts = riskUsd / riskDistanceInPrice;
    const stepped = Math.floor(rawContracts / details.step) * details.step;
    calculatedUnits = Math.max(details.minLot, Math.min(100000, stepped));
  }

  return calculatedUnits;
}
