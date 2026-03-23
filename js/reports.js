// js/reports.js  —  Reports module (v2 — all five reports, CSV + Excel export)

// ── Shared date filter ────────────────────────────────────────────────────────
function rptFilterBar(reportFn) {
  const years = [...new Set([
    ...DB.invoices.map(i=>new Date(i.date).getFullYear()),
    ...DB.purchaseOrders.map(p=>new Date(p.date).getFullYear()),
    ...DB.supplierInvoices.map(si=>new Date(si.date).getFullYear()),
  ])].sort((a,b)=>b-a);
  const yr = new Date().getFullYear();
  return `<div class="rpt-filter card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px">
    <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888">Date Range</span>
    <select id="rpt-yr" onchange="rptYearChange()" style="padding:5px 9px;font-size:12px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg);color:var(--text)">
      <option value="">Custom range</option>
      ${years.map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('')}
    </select>
    <span style="font-size:12px;color:#888">or</span>
    <input type="date" id="rpt-from" style="padding:5px 9px;font-size:12px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg);color:var(--text)">
    <span style="font-size:12px;color:#888">to</span>
    <input type="date" id="rpt-to" style="padding:5px 9px;font-size:12px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg);color:var(--text)">
    <button class="btn pri" onclick="${reportFn}()">▶ Run</button>
    <button class="btn" onclick="rptPrint()">🖨 Print</button>
    <button class="btn" onclick="rptExportCSV()">⬇ CSV</button>
    <button class="btn" onclick="rptExportExcel()">⬇ Excel</button>
  </div>`;
}

function rptYearChange() {
  const yr = $('rpt-yr').value;
  if (yr) { $('rpt-from').value=yr+'-01-01'; $('rpt-to').value=yr+'-12-31'; }
}

function rptDates() {
  let from=$('rpt-from').value, to=$('rpt-to').value;
  if (!from&&!to) { const yr=new Date().getFullYear(); from=yr+'-01-01'; to=yr+'-12-31'; }
  return { from:from||'2000-01-01', to:to||'2099-12-31' };
}

function inRange(d,from,to) { return d>=from && d<=to; }

// ── REPORTS HOME ──────────────────────────────────────────────────────────────
function renderReports() {
  const cards = [
    {id:'revenue',    icon:'📊', title:'Revenue & Profit',          desc:'Monthly billing & true revenue, gross/net profit split by USD and TZS, service type breakdown and overheads.'},
    {id:'receivables',icon:'🧾', title:'Client Ledger & Aged Receivables', desc:'All client invoices with payment status, ageing buckets (current, 30, 60, 90+ days) and balances.'},
    {id:'payables',   icon:'📤', title:'Supplier Ledger & Aged Payables',  desc:'All supplier invoices grouped by supplier with outstanding amounts and ageing buckets.'},
    {id:'pos',        icon:'📋', title:'Purchase Order Report',      desc:'All purchase orders with status, linked invoices, items, reimbursable costs and service fees.'},
    {id:'cashflow',   icon:'💰', title:'Cash Flow & Payments',       desc:'All client receipts, supplier payments and expense payments in date order with running totals.'},
  ];
  $('content').innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:960px">
    ${cards.map(c=>`
    <div class="card rpt-card" onclick="runReport('${c.id}')" style="cursor:pointer;border:1.5px solid transparent">
      <div style="font-size:24px;margin-bottom:8px">${c.icon}</div>
      <div style="font-weight:600;font-size:14px;margin-bottom:5px">${c.title}</div>
      <div style="font-size:12px;color:#888;line-height:1.5">${c.desc}</div>
    </div>`).join('')}
  </div>`;
}

function runReport(type) {
  const yr=new Date().getFullYear();
  $('content').innerHTML=`
  <div style="margin-bottom:10px">
    <button class="btn" onclick="renderReports()" style="font-size:12px">← All Reports</button>
  </div>
  ${rptFilterBar('run_'+type)}
  <div id="rpt-output"></div>`;
  if($('rpt-yr')){$('rpt-yr').value=yr;$('rpt-from').value=yr+'-01-01';$('rpt-to').value=yr+'-12-31';}
  window['run_'+type]();
}

// ── helper: summary metric card ────────────────────────────────────────────────
function rmc(col,lbl,val,sub) {
  return `<div class="metric" style="border-left:3px solid ${col}">
    <div class="lbl">${lbl}</div>
    <div class="val" style="color:${col};font-size:14px">${val}</div>
    ${sub?`<div class="sub">${sub}</div>`:''}
  </div>`;
}

// ── REPORT 1: Revenue & Profit ─────────────────────────────────────────────────
function run_revenue() {
  const {from,to}=rptDates();
  const invs=DB.invoices.filter(i=>inRange(i.date,from,to));
  const months={};
  invs.forEach(i=>{
    const k=i.date.slice(0,7);
    if(!months[k]) months[k]={k,bRU:0,bCU:0,tRU:0,tCU:0,bRT:0,bCT:0,tRT:0,tCT:0};
    const m=months[k],bR=invTotal(i),bC=invCost(i),tR=invTrueRevenue(i),tC=invTrueCost(i);
    if(i.currency==='USD'){m.bRU+=bR;m.bCU+=bC;m.tRU+=tR;m.tCU+=tC;}
    else{m.bRT+=bR;m.bCT+=bC;m.tRT+=tR;m.tCT+=tC;}
  });
  let [SbRU,SbCU,StRU,StCU,SbRT,SbCT,StRT,StCT]=[0,0,0,0,0,0,0,0];
  Object.values(months).forEach(m=>{SbRU+=m.bRU;SbCU+=m.bCU;StRU+=m.tRU;StCU+=m.tCU;SbRT+=m.bRT;SbCT+=m.bCT;StRT+=m.tRT;StCT+=m.tCT;});
  const exps=(DB.overheads||[]).filter(e=>inRange(e.date,from,to));
  const expUSD=exps.reduce((s,e)=>s+(e.currency==='USD'?e.amount:e.amount/FX.rate),0);
  const expUSDonly=exps.filter(e=>e.currency==='USD').reduce((s,e)=>s+e.amount,0);
  const expTZS=exps.filter(e=>e.currency==='TZS').reduce((s,e)=>s+e.amount,0);
  const bGPU=SbRU-SbCU,tGPU=StRU-StCU,bGPT=SbRT-SbCT,tGPT=StRT-StCT;
  const netU=tGPU-expUSDonly, netT=tGPT-expTZS;
  const byType={};
  invs.forEach(i=>i.services.forEach(sv=>{const t=sv.type;if(!byType[t])byType[t]={bRU:0,tRU:0,bRT:0,tRT:0};const bR=svcRevenue(sv),tR=svcTrueRevenue(sv);if(i.currency==='USD'){byType[t].bRU+=bR;byType[t].tRU+=tR;}else{byType[t].bRT+=bR;byType[t].tRT+=tR;}}));
  const sorted=Object.values(months).sort((a,b)=>a.k.localeCompare(b.k));
  $('rpt-output').innerHTML=`<div id="rpt-printable">
  <div class="rpt-title">Revenue & Profit Report <span style="font-size:12px;color:#888;font-weight:400">${from} → ${to}</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr) repeat(3,1fr);gap:8px;margin-bottom:14px">
    ${rmc('#3b82f6','USD Billing Revenue',fmtA(SbRU,'USD'),'True: '+fmtA(StRU,'USD'))}
    ${rmc('#22c55e','USD Billing Gross Profit',fmtA(bGPU,'USD'),'True GP: '+fmtA(tGPU,'USD'))}
    ${rmc(netU>=0?'#7e22ce':'#b91c1c','USD Net Profit',fmtA(netU,'USD'),'After USD expenses')}
    ${rmc('#06b6d4','TZS Billing Revenue',fmtA(SbRT,'TZS'),'True: '+fmtA(StRT,'TZS'))}
    ${rmc('#84cc16','TZS Billing Gross Profit',fmtA(bGPT,'TZS'),'True GP: '+fmtA(tGPT,'TZS'))}
    ${rmc(netT>=0?'#7e22ce':'#b91c1c','TZS Net Profit',fmtA(netT,'TZS'),'After TZS expenses')}
  </div>
  <div class="rpt-section">Monthly Breakdown</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Month</th><th class="r">USD Bill.Rev</th><th class="r">USD True Rev</th><th class="r">USD Bill.GP</th><th class="r">USD True GP</th><th class="r">TZS Bill.Rev</th><th class="r">TZS True Rev</th><th class="r">TZS Bill.GP</th><th class="r">TZS True GP</th></tr></thead>
    <tbody>
      ${sorted.map(m=>`<tr><td style="font-weight:500">${m.k}</td>
        <td class="r">${m.bRU?fmtA(m.bRU,'USD'):'—'}</td><td class="r">${m.tRU?fmtA(m.tRU,'USD'):'—'}</td>
        <td class="r ${m.bRU-m.bCU>=0?'c-green':'c-red'}">${m.bRU?fmtA(m.bRU-m.bCU,'USD'):'—'}</td>
        <td class="r ${m.tRU-m.tCU>=0?'c-green':'c-red'}">${m.tRU?fmtA(m.tRU-m.tCU,'USD'):'—'}</td>
        <td class="r">${m.bRT?fmtA(m.bRT,'TZS'):'—'}</td><td class="r">${m.tRT?fmtA(m.tRT,'TZS'):'—'}</td>
        <td class="r ${m.bRT-m.bCT>=0?'c-green':'c-red'}">${m.bRT?fmtA(m.bRT-m.bCT,'TZS'):'—'}</td>
        <td class="r ${m.tRT-m.tCT>=0?'c-green':'c-red'}">${m.tRT?fmtA(m.tRT-m.tCT,'TZS'):'—'}</td>
      </tr>`).join('')}
      <tr class="rpt-total"><td>TOTAL</td>
        <td class="r">${fmtA(SbRU,'USD')}</td><td class="r">${fmtA(StRU,'USD')}</td>
        <td class="r c-green">${fmtA(bGPU,'USD')}</td><td class="r c-green">${fmtA(tGPU,'USD')}</td>
        <td class="r">${fmtA(SbRT,'TZS')}</td><td class="r">${fmtA(StRT,'TZS')}</td>
        <td class="r c-green">${fmtA(bGPT,'TZS')}</td><td class="r c-green">${fmtA(tGPT,'TZS')}</td>
      </tr>
    </tbody>
  </table></div>
  <div class="rpt-section" style="margin-top:16px">By Service Type</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Service</th><th class="r">USD Bill.Rev</th><th class="r">USD True Rev</th><th class="r">TZS Bill.Rev</th><th class="r">TZS True Rev</th></tr></thead>
    <tbody>${Object.entries(byType).map(([t,v])=>`<tr>
      <td><span class="badge b-gray">${t}</span></td>
      <td class="r">${v.bRU?fmtA(v.bRU,'USD'):'—'}</td><td class="r">${v.tRU?fmtA(v.tRU,'USD'):'—'}</td>
      <td class="r">${v.bRT?fmtA(v.bRT,'TZS'):'—'}</td><td class="r">${v.tRT?fmtA(v.tRT,'TZS'):'—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>
  <div class="rpt-section" style="margin-top:16px">Overheads in Period</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="r">Cur</th><th class="r">Amount</th></tr></thead>
    <tbody>${exps.map(e=>`<tr><td>${fmtD(e.date)}</td><td>${e.description}</td><td><span class="badge b-gray">${e.category}</span></td><td class="r">${curBadge(e.currency)}</td><td class="r c-red">${fmtA(e.amount,e.currency)}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#888;padding:10px">No expenses in period</td></tr>'}
    <tr class="rpt-total"><td colspan="4">Total (USD equiv.)</td><td class="r c-red">$${Math.round(expUSD).toLocaleString()}</td></tr>
    </tbody>
  </table></div>
  </div>`;
  window._rptCSV=[['Month','USD Bill.Rev','USD True Rev','USD Bill.GP','USD True GP','TZS Bill.Rev','TZS True Rev','TZS Bill.GP','TZS True GP'],...sorted.map(m=>[m.k,m.bRU,m.tRU,m.bRU-m.bCU,m.tRU-m.tCU,m.bRT,m.tRT,m.bRT-m.bCT,m.tRT-m.tCT]),['TOTAL',SbRU,StRU,bGPU,tGPU,SbRT,StRT,bGPT,tGPT]];
  window._rptCSVName='revenue-'+from+'-'+to;
}

// ── REPORT 2: Client Ledger & Aged Receivables ────────────────────────────────
function run_receivables() {
  const {from,to}=rptDates();
  const today=new Date(); today.setHours(0,0,0,0);
  const invs=DB.invoices.filter(i=>inRange(i.date,from,to));
  function age(due){
    if(!due)return'No due date';
    const diff=Math.floor((today-new Date(due))/86400000);
    return diff<=0?'Current':diff<=30?'1–30 days':diff<=60?'31–60 days':diff<=90?'61–90 days':'90+ days';
  }
  let tIU=0,tPU=0,tIT=0,tPT=0;
  const ageTot={'Current':0,'1–30 days':0,'31–60 days':0,'61–90 days':0,'90+ days':0,'No due date':0};
  invs.forEach(i=>{const t=invTotal(i),b=t-i.paid;if(i.currency==='USD'){tIU+=t;tPU+=i.paid;}else{tIT+=t;tPT+=i.paid;}if(b>0)ageTot[age(i.due)]=(ageTot[age(i.due)]||0)+(i.currency==='USD'?b:b/FX.rate);});
  $('rpt-output').innerHTML=`<div id="rpt-printable">
  <div class="rpt-title">Client Ledger & Aged Receivables <span style="font-size:12px;color:#888;font-weight:400">${from} → ${to}</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr) repeat(3,1fr);gap:8px;margin-bottom:14px">
    ${rmc('#3b82f6','USD Invoiced',fmtA(tIU,'USD'),null)}${rmc('#22c55e','USD Collected',fmtA(tPU,'USD'),null)}${rmc('#ef4444','USD Outstanding',fmtA(tIU-tPU,'USD'),null)}
    ${rmc('#06b6d4','TZS Invoiced',fmtA(tIT,'TZS'),null)}${rmc('#84cc16','TZS Collected',fmtA(tPT,'TZS'),null)}${rmc('#ef4444','TZS Outstanding',fmtA(tIT-tPT,'TZS'),null)}
  </div>
  <div class="rpt-section">Ageing Summary (USD equiv.)</div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px">
    ${['Current','1–30 days','31–60 days','61–90 days','90+ days'].map(b=>rmc(b==='Current'?'#22c55e':b==='1–30 days'?'#f59e0b':b==='31–60 days'?'#f97316':'#b91c1c',b,'$'+Math.round(ageTot[b]||0).toLocaleString(),null)).join('')}
  </div>
  <div class="rpt-section">Invoice Detail</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Invoice</th><th>Sup.Inv</th><th>Trip Ref</th><th>Client</th><th>Date</th><th>Due</th><th>Ageing</th><th class="r">Cur</th><th class="r">Total</th><th class="r">Paid</th><th class="r">Balance</th><th>Status</th></tr></thead>
    <tbody>${invs.map(i=>{const t=invTotal(i),b=t-i.paid,bkt=age(i.due);return`<tr>
      <td>${i.id}</td><td style="font-size:11px;color:#888">${i.jobRef||'—'}</td><td style="font-size:11px;color:#185fa5">${i.tripRef||'—'}</td>
      <td style="font-size:12px">${cl(i.clientId).company||''}</td><td>${fmtD(i.date)}</td><td>${fmtD(i.due)}</td>
      <td><span class="badge ${bkt==='Current'?'b-ok':bkt==='1–30 days'?'b-warn':'b-danger'}">${bkt}</span></td>
      <td class="r">${curBadge(i.currency)}</td><td class="r">${fmtA(t,i.currency)}</td><td class="r">${fmtA(i.paid,i.currency)}</td>
      <td class="r" style="color:${b>0?'var(--red-text)':'var(--green-text)'}">${b>0?fmtA(b,i.currency):'Nil'}</td><td>${statusBadge(i.status)}</td>
    </tr>`;}).join('')}
    <tr class="rpt-total"><td colspan="8">TOTALS</td><td class="r">${fmtA(tIU,'USD')} / ${fmtA(tIT,'TZS')}</td><td class="r">${fmtA(tPU,'USD')} / ${fmtA(tPT,'TZS')}</td><td class="r c-red">${fmtA(tIU-tPU,'USD')} / ${fmtA(tIT-tPT,'TZS')}</td><td></td></tr>
    </tbody>
  </table></div>
  </div>`;
  window._rptCSV=[['Invoice','Sup.Inv','Trip Ref','Client','Date','Due','Ageing','Currency','Total','Paid','Balance','Status'],...invs.map(i=>{const t=invTotal(i),b=t-i.paid;return[i.id,i.jobRef||'',i.tripRef||'',cl(i.clientId).company||'',i.date,i.due,age(i.due),i.currency,t,i.paid,b,i.status];})];
  window._rptCSVName='client-receivables-'+from+'-'+to;
}

// ── REPORT 3: Supplier Ledger & Aged Payables ─────────────────────────────────
function run_payables() {
  const {from,to}=rptDates();
  const today=new Date(); today.setHours(0,0,0,0);
  const sinvs=DB.supplierInvoices.filter(si=>inRange(si.date,from,to));
  function age(d){const diff=Math.floor((today-new Date(d))/86400000);return diff<=30?'0–30 days':diff<=60?'31–60 days':diff<=90?'61–90 days':'90+ days';}
  let tU=0,oU=0,tT=0,oT=0;
  const ageTot={'0–30 days':0,'31–60 days':0,'61–90 days':0,'90+ days':0};
  const bySup={};
  sinvs.forEach(si=>{if(si.currency==='USD'){tU+=si.amount;if(si.status!=='Paid')oU+=si.amount;}else{tT+=si.amount;if(si.status!=='Paid')oT+=si.amount;}if(si.status!=='Paid')ageTot[age(si.date)]=(ageTot[age(si.date)]||0)+(si.currency==='USD'?si.amount:si.amount/FX.rate);if(!bySup[si.supplierId])bySup[si.supplierId]={invs:[],tU:0,oU:0,tT:0,oT:0};const b=bySup[si.supplierId];b.invs.push(si);if(si.currency==='USD'){b.tU+=si.amount;if(si.status!=='Paid')b.oU+=si.amount;}else{b.tT+=si.amount;if(si.status!=='Paid')b.oT+=si.amount;}});
  $('rpt-output').innerHTML=`<div id="rpt-printable">
  <div class="rpt-title">Supplier Ledger & Aged Payables <span style="font-size:12px;color:#888;font-weight:400">${from} → ${to}</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr) repeat(3,1fr);gap:8px;margin-bottom:14px">
    ${rmc('#3b82f6','USD Total Billed',fmtA(tU,'USD'),null)}${rmc('#ef4444','USD Outstanding',fmtA(oU,'USD'),null)}${rmc('#22c55e','USD Paid',fmtA(tU-oU,'USD'),null)}
    ${rmc('#06b6d4','TZS Total Billed',fmtA(tT,'TZS'),null)}${rmc('#ef4444','TZS Outstanding',fmtA(oT,'TZS'),null)}${rmc('#84cc16','TZS Paid',fmtA(tT-oT,'TZS'),null)}
  </div>
  <div class="rpt-section">Ageing of Outstanding (USD equiv.)</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
    ${['0–30 days','31–60 days','61–90 days','90+ days'].map(b=>rmc(b==='0–30 days'?'#22c55e':b==='31–60 days'?'#f59e0b':b==='61–90 days'?'#f97316':'#b91c1c',b,'$'+Math.round(ageTot[b]||0).toLocaleString(),null)).join('')}
  </div>
  <div class="rpt-section">By Supplier</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Supplier</th><th>Service</th><th class="r">USD Billed</th><th class="r">USD Owed</th><th class="r">TZS Billed</th><th class="r">TZS Owed</th></tr></thead>
    <tbody>${Object.entries(bySup).map(([sid,v])=>{const s=sp(sid);return`<tr><td style="font-weight:500">${s.company||sid}</td><td><span class="badge b-gray">${s.serviceType||'—'}</span></td><td class="r">${v.tU?fmtA(v.tU,'USD'):'—'}</td><td class="r" style="color:${v.oU?'var(--red-text)':'var(--green-text)'}">${v.oU?fmtA(v.oU,'USD'):'Nil'}</td><td class="r">${v.tT?fmtA(v.tT,'TZS'):'—'}</td><td class="r" style="color:${v.oT?'var(--red-text)':'var(--green-text)'}">${v.oT?fmtA(v.oT,'TZS'):'Nil'}</td></tr>`;}).join('')}</tbody>
  </table></div>
  <div class="rpt-section" style="margin-top:16px">Invoice Detail</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Ref #</th><th>Trip Ref</th><th>Supplier</th><th>PO Ref</th><th>Date</th><th>Ageing</th><th class="r">Cur</th><th class="r">Amount</th><th>Status</th></tr></thead>
    <tbody>${sinvs.map(si=>{const bkt=age(si.date);return`<tr><td>${si.id}</td><td style="font-size:11px;color:#185fa5">${si.tripRef||'—'}</td><td style="font-size:12px">${sp(si.supplierId).company||''}</td><td class="c-muted" style="font-size:11px">${si.poRef||'—'}</td><td>${fmtD(si.date)}</td><td><span class="badge ${si.status==='Paid'?'b-ok':bkt==='0–30 days'?'b-warn':'b-danger'}">${si.status==='Paid'?'Paid':bkt}</span></td><td class="r">${curBadge(si.currency)}</td><td class="r">${fmtA(si.amount,si.currency)}</td><td>${statusBadge(si.status)}</td></tr>`;}).join('')}</tbody>
  </table></div>
  </div>`;
  window._rptCSV=[['Ref','Trip Ref','Supplier','PO Ref','Date','Currency','Amount','Status'],...sinvs.map(si=>[si.id,si.tripRef||'',sp(si.supplierId).company||'',si.poRef||'',si.date,si.currency,si.amount,si.status])];
  window._rptCSVName='supplier-payables-'+from+'-'+to;
}

// ── REPORT 4: Purchase Order Report ───────────────────────────────────────────
function run_pos() {
  const {from,to}=rptDates();
  const pos=DB.purchaseOrders.filter(p=>inRange(p.date,from,to));
  let tCostU=0,tSFU=0,tCostT=0,tSFT=0;
  pos.forEach(po=>{
    const cost=poTotal(po),sf=(po.items||[]).reduce((s,it)=>s+(it.serviceFee||0),0);
    if(po.currency==='USD'){tCostU+=cost;tSFU+=sf;}else{tCostT+=cost;tSFT+=sf;}
  });
  const statuses={Pending:0,Billed:0,Paid:0};
  pos.forEach(po=>{ const s=poStatus(po); statuses[s]=(statuses[s]||0)+1; });
  $('rpt-output').innerHTML=`<div id="rpt-printable">
  <div class="rpt-title">Purchase Order Report <span style="font-size:12px;color:#888;font-weight:400">${from} → ${to}</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr) repeat(3,1fr);gap:8px;margin-bottom:14px">
    ${rmc('#3b82f6','Total POs',pos.length+' orders',`Pending: ${statuses.Pending||0} · Billed: ${statuses.Billed||0} · Paid: ${statuses.Paid||0}`)}
    ${rmc('#06b6d4','USD Reimbursable Cost',fmtA(tCostU,'USD'),'Pass-through to client')}
    ${rmc('#22c55e','USD Service Fees',fmtA(tSFU,'USD'),'Travelogue revenue')}
    ${rmc('#3b82f6','','')}
    ${rmc('#0e7490','TZS Reimbursable Cost',fmtA(tCostT,'TZS'),'Pass-through to client')}
    ${rmc('#65a30d','TZS Service Fees',fmtA(tSFT,'TZS'),'Travelogue revenue')}
  </div>
  <div class="rpt-section">Purchase Order Detail</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>PO #</th><th>Trip Ref</th><th>Supplier</th><th>Linked Invoice</th><th>Date</th><th class="r">Cur</th><th class="r">Reimb. Cost</th><th class="r">Service Fees</th><th class="r">Total</th><th>Status</th></tr></thead>
    <tbody>${pos.map(po=>{
      const cost=poTotal(po),sf=(po.items||[]).reduce((s,it)=>s+(it.serviceFee||0),0);
      return`<tr>
        <td>${po.id}</td>
        <td style="font-size:11px;color:#185fa5">${po.tripRef||'—'}</td>
        <td style="font-size:12px">${sp(po.supplierId).company||''}</td>
        <td style="font-size:11px;color:#888">${po.invoiceRef||'—'}</td>
        <td>${fmtD(po.date)}</td>
        <td class="r">${curBadge(po.currency)}</td>
        <td class="r">${fmtA(cost,po.currency)}</td>
        <td class="r c-green">${sf?fmtA(sf,po.currency):'—'}</td>
        <td class="r" style="font-weight:500">${fmtA(cost+sf,po.currency)}</td>
        <td>${statusBadge(poStatus(po))}</td>
      </tr>`;}).join('')}
    <tr class="rpt-total"><td colspan="6">TOTALS</td>
      <td class="r">${fmtA(tCostU,'USD')} / ${fmtA(tCostT,'TZS')}</td>
      <td class="r c-green">${fmtA(tSFU,'USD')} / ${fmtA(tSFT,'TZS')}</td>
      <td class="r">${fmtA(tCostU+tSFU,'USD')} / ${fmtA(tCostT+tSFT,'TZS')}</td>
      <td></td>
    </tr>
    </tbody>
  </table></div>
  <div class="rpt-section" style="margin-top:16px">Line Item Detail</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>PO #</th><th>Trip Ref</th><th>Supplier</th><th>Description</th><th>Type</th><th class="r">Qty</th><th class="r">Unit Cost</th><th class="r">Total Cost</th><th class="r">Svc Fee</th></tr></thead>
    <tbody>${pos.flatMap(po=>(po.items||[]).map(it=>`<tr>
      <td style="font-size:11px">${po.id}</td>
      <td style="font-size:11px;color:#185fa5">${po.tripRef||'—'}</td>
      <td style="font-size:11px">${sp(po.supplierId).company||''}</td>
      <td>${it.desc}</td>
      <td><span class="badge b-gray">${it.type}</span></td>
      <td class="r">${it.qty}</td>
      <td class="r">${fmtA(it.unit,po.currency)}</td>
      <td class="r">${fmtA(it.total,po.currency)}</td>
      <td class="r c-green">${it.serviceFee?fmtA(it.serviceFee,po.currency):'—'}</td>
    </tr>`)).join('')}
    </tbody>
  </table></div>
  </div>`;
  window._rptCSV=[
    ['PO #','Trip Ref','Supplier','Linked Invoice','Date','Currency','Reimb. Cost','Service Fee','Total','Status'],
    ...pos.map(po=>{const cost=poTotal(po),sf=(po.items||[]).reduce((s,it)=>s+(it.serviceFee||0),0);return[po.id,po.tripRef||'',sp(po.supplierId).company||'',po.invoiceRef||'',po.date,po.currency,cost,sf,cost+sf,poStatus(po)];})
  ];
  window._rptCSVName='purchase-orders-'+from+'-'+to;
}

// ── REPORT 5: Cash Flow & Payments ────────────────────────────────────────────
function run_cashflow() {
  const {from,to}=rptDates();
  const events=[];
  DB.invoices.forEach(inv=>(inv.payments||[]).forEach(p=>{if(inRange(p.date,from,to))events.push({date:p.date,type:'Receipt',party:cl(inv.clientId).company||inv.clientId,ref:inv.id,tripRef:inv.tripRef||inv.jobRef||'',cur:inv.currency,in:p.amount,out:0,note:p.note||''});}));
  DB.supplierInvoices.filter(si=>si.status==='Paid'&&inRange(si.date,from,to)).forEach(si=>events.push({date:si.date,type:'Payment',party:sp(si.supplierId).company||si.supplierId,ref:si.id,tripRef:si.tripRef||'',cur:si.currency,in:0,out:si.amount,note:'Supplier paid'}));
  (DB.overheads||[]).filter(e=>inRange(e.date,from,to)).forEach(e=>events.push({date:e.date,type:'Expense',party:e.category,ref:e.id,tripRef:'',cur:e.currency,in:0,out:e.amount,note:e.description}));
  events.sort((a,b)=>a.date.localeCompare(b.date));
  let tInU=0,tOutU=0,tInT=0,tOutT=0;
  events.forEach(e=>{if(e.cur==='USD'){tInU+=e.in;tOutU+=e.out;}else{tInT+=e.in;tOutT+=e.out;}});
  $('rpt-output').innerHTML=`<div id="rpt-printable">
  <div class="rpt-title">Cash Flow & Payments Report <span style="font-size:12px;color:#888;font-weight:400">${from} → ${to}</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr) repeat(3,1fr);gap:8px;margin-bottom:14px">
    ${rmc('#22c55e','USD Cash In',fmtA(tInU,'USD'),null)}${rmc('#ef4444','USD Cash Out',fmtA(tOutU,'USD'),null)}${rmc(tInU-tOutU>=0?'#1d4ed8':'#b91c1c','USD Net',fmtA(tInU-tOutU,'USD'),null)}
    ${rmc('#22c55e','TZS Cash In',fmtA(tInT,'TZS'),null)}${rmc('#ef4444','TZS Cash Out',fmtA(tOutT,'TZS'),null)}${rmc(tInT-tOutT>=0?'#0e7490':'#b91c1c','TZS Net',fmtA(tInT-tOutT,'TZS'),null)}
  </div>
  <div class="rpt-section">Transaction Log</div>
  <div class="tbl-wrap"><table class="rpt-table">
    <thead><tr><th>Date</th><th>Type</th><th>Party</th><th>Reference</th><th>Trip Ref</th><th>Note</th><th class="r">Cur</th><th class="r">Cash In</th><th class="r">Cash Out</th></tr></thead>
    <tbody>${events.map(e=>`<tr>
      <td>${fmtD(e.date)}</td>
      <td><span class="badge ${e.type==='Receipt'?'b-ok':e.type==='Payment'?'b-danger':'b-warn'}">${e.type}</span></td>
      <td style="font-size:12px">${e.party}</td><td style="font-size:11px;color:#888">${e.ref}</td>
      <td style="font-size:11px;color:#185fa5">${e.tripRef||'—'}</td>
      <td style="font-size:11px;color:#888">${e.note}</td>
      <td class="r">${curBadge(e.cur)}</td>
      <td class="r c-green">${e.in?fmtA(e.in,e.cur):'—'}</td>
      <td class="r c-red">${e.out?fmtA(e.out,e.cur):'—'}</td>
    </tr>`).join('')||'<tr><td colspan="9" style="text-align:center;color:#888;padding:12px">No transactions in period</td></tr>'}
    <tr class="rpt-total"><td colspan="7">TOTALS</td><td class="r c-green">${fmtA(tInU,'USD')} / ${fmtA(tInT,'TZS')}</td><td class="r c-red">${fmtA(tOutU,'USD')} / ${fmtA(tOutT,'TZS')}</td></tr>
    </tbody>
  </table></div>
  </div>`;
  window._rptCSV=[['Date','Type','Party','Reference','Trip Ref','Note','Currency','Cash In','Cash Out'],...events.map(e=>[e.date,e.type,e.party,e.ref,e.tripRef||'',e.note,e.cur,e.in||'',e.out||''])];
  window._rptCSVName='cashflow-'+from+'-'+to;
}

// ── PRINT ─────────────────────────────────────────────────────────────────────
function rptPrint() {
  const style=document.createElement('style'); style.id='print-override';
  style.textContent=`@media print {
    #sidebar,#topbar,.rpt-filter,button{display:none!important}
    #app{display:block!important;height:auto!important;overflow:visible!important}
    #main,#content{display:block!important;overflow:visible!important;padding:0!important}
    .rpt-table{font-size:9.5px} .metric{break-inside:avoid}
    @page{margin:15mm}
  }`;
  document.head.appendChild(style);
  window.print();
  setTimeout(()=>{const el=document.getElementById('print-override');if(el)el.remove();},1500);
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
function rptExportCSV() {
  if(!window._rptCSV){alert('Run a report first.');return;}
  const csv=window._rptCSV.map(row=>row.map(v=>'"'+String(v===null||v===undefined?'':v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=(window._rptCSVName||'report')+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── EXPORT EXCEL (SheetJS) ─────────────────────────────────────────────────────
function rptExportExcel() {
  if(!window._rptCSV){alert('Run a report first.');return;}
  if(typeof XLSX==='undefined'){alert('Excel export library not loaded. Please check your internet connection.');return;}
  try {
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet(window._rptCSV);
    // Style header row (bold, background)
    const range=XLSX.utils.decode_range(ws['!ref']);
    for(let C=range.s.c;C<=range.e.c;C++){
      const addr=XLSX.utils.encode_cell({r:0,c:C});
      if(!ws[addr]) continue;
      ws[addr].s={font:{bold:true},fill:{fgColor:{rgb:'1A1A2E'}},alignment:{horizontal:'center'}};
    }
    // Auto column widths
    const colWidths=window._rptCSV[0].map((_,ci)=>({wch:Math.max(...window._rptCSV.map(row=>String(row[ci]===null||row[ci]===undefined?'':row[ci]).length))+2}));
    ws['!cols']=colWidths;
    const sheetName=(window._rptCSVName||'Report').slice(0,28).replace(/[\/\\?*\[\]]/g,'');
    XLSX.utils.book_append_sheet(wb,ws,sheetName);
    XLSX.writeFile(wb,(window._rptCSVName||'report')+'.xlsx');
  } catch(e){alert('Export failed: '+e.message);}
}
