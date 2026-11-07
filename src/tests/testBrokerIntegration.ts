/**
 * Multi-Broker Gateway Integration Test Suite
 * Tests Capital.com, MetaTrader 5 (MT5/MetaAPI), and IG Markets adapters,
 * credential management, order dispatch, and auto-execution.
 */

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runBrokerTests() {
  console.log('\n======================================================');
  console.log('STARTING MULTI-BROKER GATEWAY INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  const baseUrl = 'http://localhost:3000';

  // 1. Fetch broker configurations
  console.log('1. Testing GET /api/broker/configs...');
  const confRes = await fetch(`${baseUrl}/api/broker/configs`);
  assert(confRes.ok, 'GET /api/broker/configs returned 200 OK');
  const confData = await confRes.json();
  assert(confData.success === true, 'Response marked success');
  assert(confData.configs.CAPITAL_COM !== undefined, 'Capital.com configuration present');
  assert(confData.configs.MT5 !== undefined, 'MetaTrader 5 configuration present');
  assert(confData.configs.IG !== undefined, 'IG Markets configuration present');

  // 2. Test Connection Handshake for Capital.com
  console.log('\n2. Testing POST /api/broker/connect for Capital.com...');
  const capConnectRes = await fetch(`${baseUrl}/api/broker/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brokerId: 'CAPITAL_COM' }),
  });
  assert(capConnectRes.ok, 'Capital.com connect returned 200 OK');
  const capConnectData = await capConnectRes.json();
  assert(capConnectData.success === true, 'Capital.com connected successfully');
  console.log(`   Latency: ${capConnectData.latencyMs}ms, Message: ${capConnectData.message}`);

  // 3. Test Connection Handshake for MT5
  console.log('\n3. Testing POST /api/broker/connect for MetaTrader 5...');
  const mt5ConnectRes = await fetch(`${baseUrl}/api/broker/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brokerId: 'MT5' }),
  });
  assert(mt5ConnectRes.ok, 'MT5 connect returned 200 OK');
  const mt5ConnectData = await mt5ConnectRes.json();
  assert(mt5ConnectData.success === true, 'MT5 connected successfully');
  console.log(`   Latency: ${mt5ConnectData.latencyMs}ms, Message: ${mt5ConnectData.message}`);

  // 4. Test Connection Handshake for IG Markets
  console.log('\n4. Testing POST /api/broker/connect for IG Markets...');
  const igConnectRes = await fetch(`${baseUrl}/api/broker/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brokerId: 'IG' }),
  });
  assert(igConnectRes.ok, 'IG Markets connect returned 200 OK');
  const igConnectData = await igConnectRes.json();
  assert(igConnectData.success === true, 'IG Markets connected successfully');
  console.log(`   Latency: ${igConnectData.latencyMs}ms, Message: ${igConnectData.message}`);

  // 5. Select Capital.com as Active Broker and check account summary
  console.log('\n5. Testing Select Active Broker and Account Summary...');
  const selectRes = await fetch(`${baseUrl}/api/broker/select-active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brokerId: 'CAPITAL_COM' }),
  });
  assert(selectRes.ok, 'Select active broker returned 200 OK');

  const accRes = await fetch(`${baseUrl}/api/broker/account`);
  assert(accRes.ok, 'GET /api/broker/account returned 200 OK');
  const accData = await accRes.json();
  assert(accData.summary.balance > 0, `Account balance verified: $${accData.summary.balance}`);
  assert(accData.summary.equity > 0, `Account equity verified: $${accData.summary.equity}`);

  // 6. Test Manual Order Placement
  console.log('\n6. Testing POST /api/broker/order (Manual Order)...');
  const orderRes = await fetch(`${baseUrl}/api/broker/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order: {
        brokerId: 'CAPITAL_COM',
        symbol: 'EURUSD',
        direction: 'BUY',
        orderType: 'MARKET',
        units: 1000,
        entryPrice: 1.085,
        stopLoss: 1.08,
        takeProfit1: 1.095,
        riskReward: 2.0,
        clientOrderId: `test-manual-${Date.now()}`,
        source: 'MANUAL_TICKET',
      },
    }),
  });
  assert(orderRes.ok, 'POST /api/broker/order returned 200 OK');
  const orderData = await orderRes.json();
  assert(orderData.success === true, 'Order execution succeeded');
  assert(orderData.result.status === 'FILLED', `Order filled with Ticket: ${orderData.result.brokerTicketId}`);

  // 7. Verify Open Position
  console.log('\n7. Verifying Open Positions on Capital.com...');
  const posRes = await fetch(`${baseUrl}/api/broker/positions`);
  assert(posRes.ok, 'GET /api/broker/positions returned 200 OK');
  const posData = await posRes.json();
  assert(posData.positions.length >= 1, `Open positions count: ${posData.positions.length}`);
  const openTicket = posData.positions[0].brokerTicketId;

  // 8. Close Position
  console.log(`\n8. Testing Closing Position (Ticket: ${openTicket})...`);
  const closeRes = await fetch(`${baseUrl}/api/broker/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brokerId: 'CAPITAL_COM', ticketId: openTicket }),
  });
  assert(closeRes.ok, 'POST /api/broker/close returned 200 OK');

  // 9. Test Toggle Auto-Execution
  console.log('\n9. Testing Toggle Auto-Execution...');
  const autoRes = await fetch(`${baseUrl}/api/broker/toggle-auto-execution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true }),
  });
  assert(autoRes.ok, 'Toggle auto-execution returned 200 OK');
  const autoData = await autoRes.json();
  assert(autoData.isAutoExecutionEnabled === true, 'Auto-execution flag enabled');

  // 10. Audit Logs
  console.log('\n10. Verifying Execution Audit Trail...');
  const auditRes = await fetch(`${baseUrl}/api/broker/audit-logs`);
  assert(auditRes.ok, 'GET /api/broker/audit-logs returned 200 OK');
  const auditData = await auditRes.json();
  assert(auditData.logs.length >= 1, `Audit trail logs recorded: ${auditData.logs.length}`);

  // 11. Symbol and Epic Mapping Verification for all 12 assets
  console.log('\n11. Verifying Multi-Broker Symbol Mapping for all 12 Assets...');
  const mapRes = await fetch(`${baseUrl}/api/broker/symbols-mapping`);
  assert(mapRes.ok, 'GET /api/broker/symbols-mapping returned 200 OK');
  const mapData = await mapRes.json();
  assert(mapData.instruments.length === 12, `All 12 instruments configured (found ${mapData.instruments.length})`);

  const gold = mapData.instruments.find((i: any) => i.terminalSymbol === 'XAUUSD');
  assert(gold?.brokers?.CAPITAL_COM?.epic === 'GOLD', 'Gold mapped to Capital.com epic GOLD');
  assert(gold?.brokers?.MT5?.epic === 'XAUUSD', 'Gold mapped to MT5 symbol XAUUSD');
  assert(gold?.brokers?.IG?.epic === 'CS.D.CFDGOLD.CFD.IP', 'Gold mapped to IG epic CS.D.CFDGOLD.CFD.IP');

  const wti = mapData.instruments.find((i: any) => i.terminalSymbol === 'WTI');
  assert(wti?.brokers?.CAPITAL_COM?.epic === 'OIL_CRUDE', 'WTI mapped to Capital.com epic OIL_CRUDE');
  assert(wti?.brokers?.MT5?.epic === 'USOIL', 'WTI mapped to MT5 symbol USOIL');
  assert(wti?.brokers?.IG?.epic === 'CC.D.CL.USS.IP', 'WTI mapped to IG epic CC.D.CL.USS.IP');

  const brent = mapData.instruments.find((i: any) => i.terminalSymbol === 'BRENT');
  assert(brent?.brokers?.CAPITAL_COM?.epic === 'OIL_BRENT', 'Brent mapped to Capital.com epic OIL_BRENT');
  assert(brent?.brokers?.MT5?.epic === 'UKOIL', 'Brent mapped to MT5 symbol UKOIL');
  assert(brent?.brokers?.IG?.epic === 'CC.D.LCO.USS.IP', 'Brent mapped to IG epic CC.D.LCO.USS.IP');

  const natgas = mapData.instruments.find((i: any) => i.terminalSymbol === 'NATGAS');
  assert(natgas?.brokers?.CAPITAL_COM?.epic === 'NATURALGAS', 'NatGas mapped to Capital.com epic NATURALGAS');
  assert(natgas?.brokers?.MT5?.epic === 'NG', 'NatGas mapped to MT5 symbol NG');
  assert(natgas?.brokers?.IG?.epic === 'CC.D.NG.USS.IP', 'NatGas mapped to IG epic CC.D.NG.USS.IP');

  // 12. Real-Time Live Price Data Feed Verification
  console.log('\n12. Verifying Real-Time Live Price Data Feed for all 12 Assets...');
  const quotesRes = await fetch(`${baseUrl}/api/quotes`);
  assert(quotesRes.ok, 'GET /api/quotes returned 200 OK');
  const quotesData = await quotesRes.json();
  assert(Object.keys(quotesData.quotes).length === 12, 'Quotes received for all 12 assets');

  for (const sym of ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'WTI', 'NATGAS']) {
    const q = quotesData.quotes[sym];
    assert(q !== undefined, `Quote exists for ${sym}`);
    assert(q.price > 0, `Price is positive for ${sym} (${q.price})`);
    assert(q.ask >= q.bid, `Ask >= Bid holds for ${sym} (${q.ask} >= ${q.bid})`);
    console.log(`   ${sym.padEnd(8)}: Price=${q.price}, Bid=${q.bid}, Ask=${q.ask}, Source=${q.source}`);
  }

  console.log('\n======================================================');
  console.log('🌟 ALL 12 MULTI-BROKER GATEWAY & PRICE TESTS PASSED 100% 🌟');
  console.log('======================================================\n');
}

runBrokerTests().catch((err) => {
  console.error('Fatal broker test failure:', err);
  process.exit(1);
});
