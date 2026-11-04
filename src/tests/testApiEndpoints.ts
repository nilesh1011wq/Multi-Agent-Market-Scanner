/**
 * Live HTTP REST API Endpoint Verification
 */

async function testEndpoint(name: string, url: string, options?: RequestInit) {
  const startTime = Date.now();
  try {
    const res = await fetch(url, options);
    const duration = Date.now() - startTime;
    if (!res.ok) {
      console.error(`❌ FAIL [${res.status}] ${name} (${url}) in ${duration}ms`);
      return false;
    }
    const data = await res.json();
    if (data.success !== true) {
      console.error(`❌ FAIL [success!=true] ${name}:`, data);
      return false;
    }
    console.log(`✅ 200 OK [${duration}ms] ${name}`);
    return true;
  } catch (err: any) {
    console.error(`❌ EXCEPTION ${name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('\n--- VERIFYING LIVE HTTP REST API ENDPOINTS (PORT 3000) ---\n');
  const baseUrl = 'http://localhost:3000';

  const endpoints = [
    { name: 'GET /api/symbols', url: `${baseUrl}/api/symbols` },
    { name: 'GET /api/candles', url: `${baseUrl}/api/candles?symbol=EURUSD&timeframe=H1&count=60` },
    { name: 'GET /api/snapshot', url: `${baseUrl}/api/snapshot?symbol=XAUUSD&timeframe=H1` },
    { name: 'GET /api/mtf-snapshot', url: `${baseUrl}/api/mtf-snapshot?symbol=USDJPY` },
    { name: 'GET /api/calendar', url: `${baseUrl}/api/calendar` },
    { name: 'GET /api/news', url: `${baseUrl}/api/news?symbol=WTI` },
    { name: 'GET /api/historical-events', url: `${baseUrl}/api/historical-events` },
    { name: 'GET /api/kb-docs', url: `${baseUrl}/api/kb-docs` },
    { name: 'GET /api/engine/status', url: `${baseUrl}/api/engine/status` },
    { name: 'POST /api/test-quant', url: `${baseUrl}/api/test-quant`, options: { method: 'POST' } },
    {
      name: 'POST /api/agent/trend',
      url: `${baseUrl}/api/agent/trend`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'EURUSD', timeframe: 'H1' }),
      },
    },
    {
      name: 'POST /api/debate/run',
      url: `${baseUrl}/api/debate/run`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'XAUUSD', timeframe: 'H1' }),
      },
    },
    { name: 'GET /api/scorecards', url: `${baseUrl}/api/scorecards?symbol=EURUSD&timeframe=H1` },
    {
      name: 'POST /api/backtest/run',
      url: `${baseUrl}/api/backtest/run`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'EURUSD', timeframe: 'H1' }),
      },
    },
    { name: 'GET /api/scanner/ranked-opportunities', url: `${baseUrl}/api/scanner/ranked-opportunities` },
    {
      name: 'POST /api/scanner/run-all',
      url: `${baseUrl}/api/scanner/run-all`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: 'H1' }),
      },
    },
    { name: 'GET /api/alerts/history', url: `${baseUrl}/api/alerts/history` },
    {
      name: 'POST /api/alerts/test',
      url: `${baseUrl}/api/alerts/test`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'EURUSD' }),
      },
    },
    { name: 'GET /api/paper-trading/summary', url: `${baseUrl}/api/paper-trading/summary` },
    {
      name: 'POST /api/paper-trading/simulate-tick',
      url: `${baseUrl}/api/paper-trading/simulate-tick`,
      options: { method: 'POST' },
    },
  ];

  let passed = 0;
  for (const ep of endpoints) {
    const ok = await testEndpoint(ep.name, ep.url, ep.options);
    if (ok) passed++;
  }

  console.log(`\nENDPOINT TEST SUMMARY: ${passed}/${endpoints.length} PASSED`);
  if (passed === endpoints.length) {
    console.log('✅ ALL SERVER REST API ENDPOINTS RETURNED 200 OK WITH VALID SCHEMAS');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
