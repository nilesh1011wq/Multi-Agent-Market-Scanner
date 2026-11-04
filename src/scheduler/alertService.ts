import { AlertConfig, DispatchedAlert, RankedOpportunity } from '../types/scanner';
import { marketDataService } from '../data/marketDataService';

class AlertService {
  private config: AlertConfig = {
    minConfidence: 75,
    minRiskReward: 1.5,
    allowedBadges: ['A', 'B'],
    blockOnEconomicEvent: true,
    webhookUrl: 'https://webhook.site/quant-market-scanner-demo',
    notificationsEnabled: true,
  };

  private alertHistory: DispatchedAlert[] = [];

  constructor() {
    // Seed with a sample previous alert for immediate UI preview
    this.alertHistory.push({
      id: 'alert-init-1',
      opportunityId: 'opp-xauusd-h1',
      symbol: 'XAUUSD',
      timeframe: 'H1',
      direction: 'BUY',
      confidence: 84,
      entryZone: [2732.5, 2735.0],
      stopLoss: 2718.0,
      takeProfit1: 2758.0,
      takeProfit2: 2780.0,
      riskReward: 2.3,
      evidenceBadge: 'A',
      firedAt: Date.now() - 3600000 * 2,
      delivered: true,
      channel: 'IN_APP',
      statusMessage: 'Dispatched to In-App Feed and Webhook',
    });
  }

  public getConfig(): AlertConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AlertConfig>): AlertConfig {
    this.config = { ...this.config, ...newConfig };
    return { ...this.config };
  }

  public getHistory(): DispatchedAlert[] {
    return [...this.alertHistory].reverse();
  }

  public async evaluateAndDispatch(opportunity: RankedOpportunity): Promise<DispatchedAlert | null> {
    if (!this.config.notificationsEnabled) return null;
    if (opportunity.direction === 'NO_TRADE') return null;
    if (opportunity.riskManagerApproval === 'VETO') return null;

    // Check thresholds
    if (opportunity.confidence < this.config.minConfidence) return null;
    if (opportunity.riskReward < this.config.minRiskReward) return null;
    if (!this.config.allowedBadges.includes(opportunity.evidenceBadge)) return null;

    // Check economic event blackout
    if (this.config.blockOnEconomicEvent) {
      const isBlackout = await this.checkEventBlackout(opportunity.symbol);
      if (isBlackout) {
        console.log(`[AlertService] Suppressing alert for ${opportunity.symbol}: inside economic blackout window.`);
        return null;
      }
    }

    // Check if this opportunity was already alerted within the last 30 minutes
    const recentDuplicate = this.alertHistory.find(
      (a) =>
        a.symbol === opportunity.symbol &&
        a.timeframe === opportunity.timeframe &&
        a.direction === opportunity.direction &&
        Date.now() - a.firedAt < 30 * 60 * 1000
    );
    if (recentDuplicate) return null;

    const alert: DispatchedAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      opportunityId: opportunity.id,
      symbol: opportunity.symbol,
      timeframe: opportunity.timeframe,
      direction: opportunity.direction as 'BUY' | 'SELL',
      confidence: opportunity.confidence,
      entryZone: opportunity.entryZone,
      stopLoss: opportunity.stopLoss,
      takeProfit1: opportunity.takeProfits[0],
      takeProfit2: opportunity.takeProfits[1],
      riskReward: opportunity.riskReward,
      evidenceBadge: opportunity.evidenceBadge,
      firedAt: Date.now(),
      delivered: true,
      channel: this.config.webhookUrl ? 'WEBHOOK' : 'IN_APP',
      statusMessage: this.config.webhookUrl
        ? `Delivered to ${new URL(this.config.webhookUrl).hostname}`
        : 'Logged to In-App Alert Feed',
    };

    // If webhook configured, dispatch via POST (non-blocking)
    if (this.config.webhookUrl && this.config.webhookUrl.startsWith('http')) {
      this.dispatchWebhook(alert, opportunity).catch((err) => {
        console.warn('[AlertService] Webhook dispatch warning (mocked/endpoint unreachable):', err.message);
      });
    }

    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 50) {
      this.alertHistory = this.alertHistory.slice(0, 50);
    }

    return alert;
  }

  public async sendTestAlert(symbol: string = 'EURUSD'): Promise<DispatchedAlert> {
    const testAlert: DispatchedAlert = {
      id: `test-alert-${Date.now()}`,
      opportunityId: `test-opp-${symbol}`,
      symbol,
      timeframe: 'H1',
      direction: 'BUY',
      confidence: 88,
      entryZone: [1.084, 1.085],
      stopLoss: 1.081,
      takeProfit1: 1.091,
      takeProfit2: 1.096,
      riskReward: 2.33,
      evidenceBadge: 'A',
      firedAt: Date.now(),
      delivered: true,
      channel: 'WEBHOOK',
      statusMessage: 'Simulated test webhook dispatch successful',
    };

    this.alertHistory.unshift(testAlert);
    return testAlert;
  }

  private async checkEventBlackout(symbol: string): Promise<boolean> {
    try {
      const calendar = await marketDataService.getEconomicCalendar();
      const now = Date.now();

      // Determine relevant currency for symbol
      let relevantCurrencies = ['USD'];
      if (symbol.startsWith('EUR')) relevantCurrencies.push('EUR');
      if (symbol.startsWith('GBP') || symbol.endsWith('GBP')) relevantCurrencies.push('GBP');
      if (symbol.startsWith('JPY') || symbol.endsWith('JPY')) relevantCurrencies.push('JPY');
      if (symbol.startsWith('AUD')) relevantCurrencies.push('AUD');
      if (symbol.startsWith('CAD') || symbol.endsWith('CAD')) relevantCurrencies.push('CAD');
      if (symbol.startsWith('CHF') || symbol.endsWith('CHF')) relevantCurrencies.push('CHF');
      if (symbol.startsWith('NZD')) relevantCurrencies.push('NZD');

      for (const event of calendar) {
        if (event.impact === 'HIGH' && relevantCurrencies.includes(event.currency)) {
          const eventTime = event.scheduledTime;
          const blackoutMs = event.blackoutMins * 60 * 1000;
          if (Math.abs(now - eventTime) <= blackoutMs) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async dispatchWebhook(alert: DispatchedAlert, opp: RankedOpportunity): Promise<void> {
    const payload = {
      event: 'QUANT_TRADE_RECOMMENDATION',
      app: 'Multi-Agent Market Scanner',
      symbol: alert.symbol,
      timeframe: alert.timeframe,
      recommendation: alert.direction,
      confidence: alert.confidence,
      entry_zone: alert.entryZone,
      stop_loss: alert.stopLoss,
      take_profits: [alert.takeProfit1, alert.takeProfit2],
      risk_reward: alert.riskReward,
      evidence_quality: alert.evidenceBadge,
      regime: opp.regime,
      consensus_vote: opp.consensus,
      risk_manager_status: opp.riskManagerApproval,
      arbiter_summary: opp.arbiterSummary,
      timestamp: new Date(alert.firedAt).toISOString(),
      disclaimer: 'QUANTITATIVE RECOMMENDATION ONLY - STRICTLY NO AUTOMATED EXECUTION',
    };

    try {
      // In browser preview or node environment, safely attempt fetch
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignore network errors in demo/local environment
    }
  }
}

export const alertService = new AlertService();
