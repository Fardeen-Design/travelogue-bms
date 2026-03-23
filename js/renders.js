// js/renders.js  —  page renderers

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getYear() { return new Date().getFullYear(); }

function monthlyData(year) {
  const rU=Array(12).fill(0),rT=Array(12).fill(0),pU=Array(12).fill(0),pT=Array(12).fill(0);
  DB.invoices.forEach(i=>{
    if (new Date(i.date).getFullYear()!==year) return;
    const m=new Date(i.date).getMonth();
    // True revenue = service fees (air) + sell (others); true cost = supplier SF (air) + buy (others)
    const r=invTrueRevenue(i), p=r-invTrueCost(i);
    if(i.currency==='USD'){rU[m]+=r;pU[m]+=p;}else{rT[m]+=r;pT[m]+=p;}
  });
  return {rU,rT,pU,pT};
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const year = getYear(), md = monthlyData(year);

  // ── Per-currency accumulators ──────────────────────────────────────────────
  let b_rU=0,b_cU=0, b_rT=0,b_cT=0;   // billing  (full invoice vs PO cost)
  let t_rU=0,t_cU=0, t_rT=0,t_cT=0;   // true P&L (service-fee for air; sell-buy for others)
  let ptU=0, ptT=0;                      // air pass-through

  DB.invoices.forEach(i => {
    if (new Date(i.date).getFullYear() !== year) return;
    const billR = invTotal(i),      billC = invCost(i);
    const trueR = invTrueRevenue(i), trueC = invTrueCost(i);
    const pt    = invAirPassthrough(i);
    if (i.currency === 'USD') {
      b_rU += billR; b_cU += billC;
      t_rU += trueR; t_cU += trueC;
      ptU  += pt;
    } else {
      b_rT += billR; b_cT += billC;
      t_rT += trueR; t_cT += trueC;
      ptT  += pt;
    }
  });

  // Gross profits per currency
  const b_gpU = b_rU - b_cU,  b_gpT = b_rT - b_cT;
  const t_gpU = t_rU - t_cU,  t_gpT = t_rT - t_cT;
  const b_mU  = b_rU ? Math.round((b_gpU/b_rU)*100) : 0;
  const b_mT  = b_rT ? Math.round((b_gpT/b_rT)*100) : 0;
  const t_mU  = t_rU ? Math.round((t_gpU/t_rU)*100) : 0;
  const t_mT  = t_rT ? Math.round((t_gpT/t_rT)*100) : 0;

  // Net profit (expenses in USD equiv, subtract from combined true gross profit)
  const expUSD = overheadTotalUSD();
  const t_gpCombined = t_gpU + t_gpT / FX.rate;
  const netP = t_gpCombined - expUSD;
  const netMarg = t_gpCombined ? Math.round((netP / t_gpCombined) * 100) : 0;

  // Receivables & payables
  const outU = DB.invoices.filter(i=>i.status!=='Paid'&&i.currency==='USD').reduce((s,i)=>s+invTotal(i)-i.paid,0);
  const outT = DB.invoices.filter(i=>i.status!=='Paid'&&i.currency==='TZS').reduce((s,i)=>s+invTotal(i)-i.paid,0);
  const owU  = DB.supplierInvoices.filter(si=>si.status!=='Paid'&&si.currency==='USD').reduce((s,si)=>s+si.amount,0);
  const owT  = DB.supplierInvoices.filter(si=>si.status!=='Paid'&&si.currency==='TZS').reduce((s,si)=>s+si.amount,0);

  // Charts use true revenue
  const revCombo  = md.rU.map((v,i) => +(v + md.rT[i]/FX.rate).toFixed(0));
  const profCombo = md.pU.map((v,i) => +(v + md.pT[i]/FX.rate).toFixed(0));

  // ── Helper: metric card ────────────────────────────────────────────────────
  function mc(col, lbl, val, subs, pct) {
    const bar = pct !== null
      ? '<div class="pbar"><div class="pbar-fill" style="width:'+Math.max(0,Math.min(100,pct))+'%;background:'+col+'"></div></div>'
      : '';
    return '<div class="metric" style="border-left:3px solid '+col+'">'
      + '<div class="lbl">'+lbl+'</div>'
      + '<div class="val" style="color:'+col+';font-size:14px">'+val+'</div>'
      + bar
      + subs.map(s=>'<div class="sub">'+s+'</div>').join('')
      + '</div>';
  }

  // ── Supplier payables: group by supplier, show per-currency breakdown ──────
  const payableRows = DB.suppliers.map(s => {
    const sinvs = DB.supplierInvoices.filter(si => si.supplierId===s.id && si.status!=='Paid');
    if (!sinvs.length) return null;
    const byC = {};
    sinvs.forEach(si => { byC[si.currency] = (byC[si.currency]||0) + si.amount; });
    const cells = Object.entries(byC).map(([cur,amt]) =>
      '<span style="display:inline-block;margin-right:8px">'+curBadge(cur)+' <span class="c-red">'+fmtA(amt,cur)+'</span></span>'
    ).join('');
    return '<tr><td style="font-size:12px">'+s.company+'</td><td style="font-size:12px" colspan="2">'+cells+'</td></tr>';
  }).filter(Boolean).join('') || '<tr><td colspan="3" style="text-align:center;color:#888;padding:14px">No outstanding payables ✓</td></tr>';

  // ── Net profit per currency (calculated before building HTML) ──────────────
  const t_gpAbsCombined = Math.abs(t_gpU) + Math.abs(t_gpT/FX.rate) || 1;
  const expShareU = expUSD * (Math.abs(t_gpU) / t_gpAbsCombined);
  const expShareT = (expUSD - expShareU) * FX.rate;
  const netPU = t_gpU - expShareU;
  const netPT = t_gpT - expShareT;
  const netMargU = t_gpU ? Math.round((netPU / t_gpU) * 100) : 0;
  const netMargT = t_gpT ? Math.round((netPT / t_gpT) * 100) : 0;

  $('content').innerHTML =
  // ── Currency labels ──────────────────────────────────────────────────────
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:2px">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#185fa5;padding:0 4px">🇺🇸 USD — United States Dollar</div>'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0e7490;padding:0 4px">🇹🇿 TZS — Tanzania Shilling</div>'
  + '</div>'

  // ── Row 1: Revenue ──────────────────────────────────────────────────────
  + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:6px">'
    + mc('#3b82f6','USD Billing Revenue',        fmtA(b_rU,'USD'), ['Full client invoice amounts'],null)
    + mc('#0ea5e9','USD True Revenue',            fmtA(t_rU,'USD'), ['Service fees + other sell','Pass-thru: '+fmtA(ptU,'USD')],null)
    + mc('#06b6d4','TZS Billing Revenue',         fmtA(b_rT,'TZS'), ['Full client invoice amounts'],null)
    + mc('#0891b2','TZS True Revenue',            fmtA(t_rT,'TZS'), ['Service fees + other sell','Pass-thru: '+fmtA(ptT,'TZS')],null)
  + '</div>'

  // ── Row 2: Gross Profit ─────────────────────────────────────────────────
  + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:6px">'
    + mc('#16a34a','USD Billing GP',   fmtA(b_gpU,'USD'), [b_mU+'% billing margin','Invoice less PO cost'],b_mU)
    + mc('#22c55e','USD True GP',      fmtA(t_gpU,'USD'), [t_mU+'% true margin',   'Service fee profit only'],t_mU)
    + mc('#65a30d','TZS Billing GP',   fmtA(b_gpT,'TZS'), [b_mT+'% billing margin','Invoice less PO cost'],b_mT)
    + mc('#84cc16','TZS True GP',      fmtA(t_gpT,'TZS'), [t_mT+'% true margin',   'Service fee profit only'],t_mT)
  + '</div>'

  // ── Row 3: Net profit + Receivables/Payables/FX ─────────────────────────
  + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px">'
    + mc(netPU>=0?'#7e22ce':'#b91c1c','USD Net Profit',
        fmtA(netPU,'USD'),
        [netMargU+'% net margin','Overheads allocated: $'+Math.round(expShareU).toLocaleString()],
        netMargU)
    + mc(netPT>=0?'#7e22ce':'#b91c1c','TZS Net Profit',
        fmtA(netPT,'TZS'),
        [netMargT+'% net margin','Overheads allocated: TZS '+Math.round(expShareT).toLocaleString()],
        netMargT)
    + '<div class="metric" style="border-left:3px solid #f59e0b">'
      + '<div class="lbl">Client Receivables</div>'
      + '<div style="margin-top:5px"><div style="font-size:10px;color:#888;margin-bottom:1px">USD</div><div style="font-size:14px;font-weight:600;color:#b45309">'+fmtA(outU,'USD')+'</div></div>'
      + '<div style="margin-top:4px"><div style="font-size:10px;color:#888;margin-bottom:1px">TZS</div><div style="font-size:13px;font-weight:600;color:#b45309">'+fmtA(outT,'TZS')+'</div></div>'
    + '</div>'
    + '<div class="metric" style="border-left:3px solid #ef4444">'
      + '<div class="lbl">Supplier Payables</div>'
      + '<div style="margin-top:5px"><div style="font-size:10px;color:#888;margin-bottom:1px">USD</div><div style="font-size:14px;font-weight:600;color:#991b1b">'+fmtA(owU,'USD')+'</div></div>'
      + '<div style="margin-top:4px"><div style="font-size:10px;color:#888;margin-bottom:1px">TZS</div><div style="font-size:13px;font-weight:600;color:#991b1b">'+fmtA(owT,'TZS')+'</div></div>'
    + '</div>'
    + '<div class="metric" style="border-left:3px solid #64748b">'
      + '<div class="lbl">Exchange Rate</div>'
      + '<div style="font-size:15px;font-weight:600;color:#334155;margin-top:5px">1 USD = TZS '+FX.rate.toLocaleString()+'</div>'
      + '<div class="sub" style="margin-top:4px"><a href="#" onclick="nav(\'settings\');return false;" style="color:#185fa5;font-size:10px">Update rate →</a></div>'
    + '</div>'
  + '</div>'

  // ── Charts ──────────────────────────────────────────────────────────────
  + '<div class="two-col" style="margin-bottom:14px">'
    + '<div class="card"><div class="card-title">'+year+' Monthly Revenue vs True Gross Profit (USD equiv.)</div>'
      + '<div style="position:relative;height:190px;overflow:hidden"><canvas id="chart-rev"></canvas></div>'
    + '</div>'
    + '<div class="card"><div class="card-title">True Revenue by Service Type</div>'
      + '<div style="position:relative;height:190px;overflow:hidden"><canvas id="chart-svc"></canvas></div>'
    + '</div>'
  + '</div>'

  // ── Tables ──────────────────────────────────────────────────────────────
  + '<div class="two-col">'
    + '<div class="card"><div class="card-title">Outstanding Client Invoices</div><div class="tbl-wrap"><table>'
      + '<thead><tr><th>Invoice</th><th>Supplier Inv</th><th>Trip Ref</th><th>Client</th><th>Cur</th><th>Balance</th><th>Status</th></tr></thead>'
      + '<tbody>' + (DB.invoices.filter(i=>i.status!=='Paid').map(i =>
          '<tr class="clk" onclick="viewInvoice(\''+i.id+'\')">'
          + '<td>'+i.id+'</td>'
          + '<td style="font-size:11px;color:#888">'+(i.jobRef||'—')+'</td>'
          + '<td style="font-size:12px">'+( cl(i.clientId).company||'')+'</td>'
          + '<td>'+curBadge(i.currency)+'</td>'
          + '<td>'+fmtA(invTotal(i)-i.paid,i.currency)+'</td>'
          + '<td>'+statusBadge(i.status)+'</td>'
          + '</tr>'
        ).join('') || '<tr><td colspan="7" style="text-align:center;color:#888;padding:14px">All invoices settled ✓</td></tr>')
      + '</tbody></table></div></div>'
    + '<div class="card"><div class="card-title">Supplier Payables</div><div class="tbl-wrap"><table>'
      + '<thead><tr><th>Supplier</th><th colspan="2">Amount Owed</th></tr></thead>'
      + '<tbody>'+payableRows+'</tbody>'
    + '</table></div></div>'
  + '</div>';

  requestAnimationFrame(() => { buildRevChart(revCombo, profCombo); buildSvcChart(year); });
}

function buildRevChart(rev, prof) {
  const canvas=document.getElementById('chart-rev'); if(!canvas) return;
  if(canvas._ch) canvas._ch.destroy();
  canvas._ch = new Chart(canvas,{
    type:'bar',
    data:{labels:MONTHS,datasets:[
      {label:'Revenue',data:rev,backgroundColor:'rgba(59,130,246,0.7)',borderRadius:3},
      {label:'Gross Profit',data:prof,backgroundColor:'rgba(34,197,94,0.7)',borderRadius:3}
    ]},
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10}}},
        y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:10},callback:v=>v>=1000?'$'+Math.round(v/1000)+'k':'$'+Math.round(v)}}
      }
    }
  });
}

function buildSvcChart(year) {
  const canvas=document.getElementById('chart-svc'); if(!canvas) return;
  if(canvas._ch) canvas._ch.destroy();

  // Collect true revenue per service type for the given year
  const byType={};
  DB.invoices.forEach(inv=>{
    if(new Date(inv.date).getFullYear()!==year) return;
    inv.services.forEach(sv=>{
      const t=sv.type;
      const r=svcTrueRevenue(sv);
      const equiv=inv.currency==='USD'?r:r/FX.rate;
      byType[t]=(byType[t]||0)+equiv;
    });
  });

  // If no data for current year, show message instead of empty chart
  const labels=Object.keys(byType).filter(t=>byType[t]>0);
  if(!labels.length){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#aaa'; ctx.font='13px sans-serif'; ctx.textAlign='center';
    ctx.fillText('No data for '+year,canvas.width/2,canvas.height/2);
    return;
  }

  const vals=labels.map(l=>Math.round(byType[l]*100)/100);
  const COLS=['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#06b6d4','#f97316','#84cc16'];

  // Format legend: use $Xk for large values, $X for small values
  function fmtVal(v) {
    if(v>=1000) return '$'+Math.round(v/1000)+'k';
    if(v>=1)    return '$'+Math.round(v);
    return '$'+v.toFixed(2);
  }

  canvas._ch = new Chart(canvas,{
    type:'doughnut',
    data:{labels,datasets:[{data:vals,backgroundColor:COLS.slice(0,labels.length),borderWidth:2,borderColor:'#fff'}]},
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:12,
        generateLabels:chart=>chart.data.labels.map((l,i)=>({
          text:l+': '+fmtVal(vals[i]),
          fillStyle:COLS[i],strokeStyle:'#fff',lineWidth:2,index:i
        }))
      }}}
    }
  });
}

// ── CLIENTS ──────────────────────────────────────────────────────────────────
function renderClients() {
  $('content').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>ID</th><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Address</th><th>TIN</th><th>VAT</th><th></th></tr></thead>
    <tbody>${DB.clients.map(c=>`<tr>
      <td class="c-muted">${c.id}</td>
      <td><strong style="font-weight:500">${esc(c.company)}</strong></td>
      <td>${esc(c.contact)}</td>
      <td class="c-muted" style="font-size:12px">${esc(c.email)}</td>
      <td style="font-size:12px">${esc(c.phone)}</td>
      <td style="font-size:12px">${esc(c.address)}</td>
      <td class="c-muted" style="font-size:11px">${c.tin||'—'}</td>
      <td class="c-muted" style="font-size:11px">${c.vat||'—'}</td>
      <td style="white-space:nowrap">
        <button class="btn sml" onclick="viewClient('${c.id}')">View</button>
        <button class="btn sml" onclick="editClient('${c.id}')">Edit</button>
        <button class="btn sml dan" onclick="deleteClient('${c.id}')">Delete</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────
function renderSuppliers() {
  $('content').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>ID</th><th>Company</th><th>Contact</th><th>Email</th><th>Service</th><th>Currency</th><th>TIN</th><th>VAT</th><th></th></tr></thead>
    <tbody>${DB.suppliers.map(s=>`<tr>
      <td class="c-muted">${s.id}</td>
      <td><strong style="font-weight:500">${esc(s.company)}</strong></td>
      <td>${esc(s.contact)}</td>
      <td class="c-muted" style="font-size:12px">${esc(s.email)}</td>
      <td><span class="badge b-gray">${s.serviceType}</span></td>
      <td>${curBadge(s.currency)}</td>
      <td class="c-muted" style="font-size:11px">${s.tin||'—'}</td>
      <td class="c-muted" style="font-size:11px">${s.vat||'—'}</td>
      <td style="white-space:nowrap">
        <button class="btn sml" onclick="viewSupplier('${s.id}')">View</button>
        <button class="btn sml" onclick="editSupplier('${s.id}')">Edit</button>
        <button class="btn sml dan" onclick="deleteSupplier('${s.id}')">Delete</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}

// ── INVOICES ──────────────────────────────────────────────────────────────────
function renderInvoices() {
  $('content').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Invoice #</th><th>Supplier Inv</th><th>Trip Ref</th><th>Client</th><th>Date</th><th>Due</th><th>Cur</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
    <tbody>${DB.invoices.map(i=>{const t=invTotal(i),b=t-i.paid;return`<tr>
      <td>${i.id}</td>
      <td style="font-size:12px;color:#888">${i.jobRef||'—'}</td>
      <td style="font-size:12px">${cl(i.clientId).company||''}</td>
      <td>${fmtD(i.date)}</td><td>${fmtD(i.due)}</td>
      <td>${curBadge(i.currency)}</td>
      <td>${fmtA(t,i.currency)}</td>
      <td>${fmtA(i.paid,i.currency)}</td>
      <td style="color:${b>0?'var(--red-text)':'var(--green-text)'}">${b>0?fmtA(b,i.currency):'Nil'}</td>
      <td>${statusBadge(i.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn sml" onclick="viewInvoice('${i.id}')">View</button>
        <button class="btn sml" onclick="editInvoice('${i.id}')">Edit</button>
        <button class="btn sml" onclick="recordPayment('${i.id}')">Pay</button>
        <button class="btn sml dan" onclick="deleteInvoice('${i.id}')">Delete</button>
      </td>
    </tr>`;}).join('')}</tbody>
  </table></div></div>`;
}

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
function renderPOs() {
  $('content').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>PO #</th><th>Trip Ref</th><th>Supplier</th><th>Date</th><th>Cur</th><th>Amount</th><th>Status</th><th>Inv. Ref</th><th></th></tr></thead>
    <tbody>${DB.purchaseOrders.map(po=>{const t=poTotal(po);return`<tr>
      <td>${po.id}</td>
      <td style="font-size:12px;font-weight:500;color:#185fa5">${po.tripRef||'—'}</td>
      <td style="font-size:12px">${sp(po.supplierId).company||''}</td>
      <td>${fmtD(po.date)}</td><td>${curBadge(po.currency)}</td>
      <td>${fmtA(t,po.currency)}</td><td>${statusBadge(poStatus(po))}</td>
      <td class="c-muted" style="font-size:12px">${po.invoiceRef||'—'}</td>
      <td style="white-space:nowrap">
        <button class="btn sml" onclick="viewPO('${po.id}')">View</button>
        <button class="btn sml" onclick="editPO('${po.id}')">Edit</button>
        <button class="btn sml pri" onclick="copyPOtoSInv('${po.id}')">→ Supplier Inv</button>
        <button class="btn sml dan" onclick="deletePO('${po.id}')">Delete</button>
      </td>
    </tr>`;}).join('')}</tbody>
  </table></div></div>`;
}

// ── SUPPLIER INVOICES ─────────────────────────────────────────────────────────
function renderSInvoices() {
  $('content').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Ref #</th><th>Trip Ref</th><th>Supplier</th><th>Date</th><th>Cur</th><th>Amount</th><th>PO Ref</th><th>Status</th><th></th></tr></thead>
    <tbody>${DB.supplierInvoices.map(si=>`<tr>
      <td>${si.id}</td>
      <td style="font-size:12px">${sp(si.supplierId).company||''}</td>
      <td>${fmtD(si.date)}</td><td>${curBadge(si.currency)}</td>
      <td>${fmtA(si.amount,si.currency)}</td>
      <td class="c-muted" style="font-size:12px">${si.poRef||'—'}</td>
      <td>${statusBadge(si.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn sml" onclick="viewSInv('${si.id}')">View</button>
        <button class="btn sml" onclick="editSInv('${si.id}')">Edit</button>
        <button class="btn sml ${si.status==='Paid'?'':'pri'}" onclick="markSIPaid('${si.id}')">${si.status==='Paid'?'✓ Paid':'Mark Paid'}</button>
        <button class="btn sml dan" onclick="deleteSInv('${si.id}')">Delete</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}

// ── OVERHEADS ─────────────────────────────────────────────────────────────────
function renderOverheads() {
  const totUSD=(DB.overheads||[]).filter(e=>e.currency==='USD').reduce((s,e)=>s+e.amount,0);
  const totTZS=(DB.overheads||[]).filter(e=>e.currency==='TZS').reduce((s,e)=>s+e.amount,0);
  const totEquiv=overheadTotalUSD();
  $('content').innerHTML=`
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px">
    <div class="metric" style="border-left:3px solid #ef4444"><div class="lbl">Total Expenses (USD)</div><div class="val" style="color:#b91c1c">${fmtA(totUSD,'USD')}</div></div>
    <div class="metric" style="border-left:3px solid #ef4444"><div class="lbl">Total Expenses (TZS)</div><div class="val" style="color:#b91c1c">${fmtA(totTZS,'TZS')}</div></div>
    <div class="metric" style="border-left:3px solid #a855f7"><div class="lbl">Total Equiv. (USD)</div><div class="val" style="color:#7e22ce">$${Math.round(totEquiv).toLocaleString()}</div><div class="sub">At 1 USD = ${FX.rate.toLocaleString()} TZS</div></div>
  </div>
  <div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Ref #</th><th>Date</th><th>Description</th><th>Category</th><th>Cur</th><th>Amount</th><th>Receipt Ref</th><th></th></tr></thead>
    <tbody>${(DB.overheads||[]).length?(DB.overheads||[]).map(e=>`<tr>
      <td class="c-muted">${e.id}</td>
      <td>${fmtD(e.date)}</td>
      <td>${esc(e.description)}</td>
      <td><span class="badge b-gray">${e.category}</span></td>
      <td>${curBadge(e.currency)}</td>
      <td class="c-red">${fmtA(e.amount,e.currency)}</td>
      <td class="c-muted" style="font-size:12px">${e.ref||'—'}</td>
      <td style="white-space:nowrap">
        <button class="btn sml" onclick="viewExpense('${e.id}')">View</button>
        <button class="btn sml" onclick="editExpense('${e.id}')">Edit</button>
        <button class="btn sml dan" onclick="deleteExpense('${e.id}')">Delete</button>
      </td>
    </tr>`).join(''):'<tr><td colspan="8" style="text-align:center;color:#888;padding:16px">No expenses recorded yet</td></tr>'}</tbody>
  </table></div></div>`;
}

// ── PROFIT TRACKER ────────────────────────────────────────────────────────────
function renderProfit() {
  let rU=0,cU=0,rT=0,cT=0;
  // byType tracks true P&L per service type
  // Air Tickets: revenue = client service fee, cost = supplier service fee (from linked POs)
  // Others: revenue = sell, cost = buy
  const byType={};
  // Also track pass-through for Air Tickets display
  const airPT={USD:0,TZS:0};

  DB.invoices.forEach(i=>{
    const r=invTrueRevenue(i),c=invTrueCost(i);
    if(i.currency==='USD'){rU+=r;cU+=c;}else{rT+=r;cT+=c;}
    i.services.forEach(sv=>{
      const t=sv.type; if(!byType[t]) byType[t]={rU:0,cU:0,rT:0,cT:0,ptU:0,ptT:0};
      const sr=svcTrueRevenue(sv), sc=svcTrueCost(sv,i.id);
      if(i.currency==='USD'){byType[t].rU+=sr;byType[t].cU+=sc;}else{byType[t].rT+=sr;byType[t].cT+=sc;}
      if(t==='Air Tickets'){
        const pt=(sv.passengers||[]).reduce((s,p)=>s+p.flightCost,0);
        if(i.currency==='USD') byType[t].ptU+=pt; else byType[t].ptT+=pt;
      }
    });
  });
  const totR=rU+rT/FX.rate,grossP=(rU-cU)+(rT-cT)/FX.rate;
  const expUSD=overheadTotalUSD(),netP=grossP-expUSD;
  const marg=totR?Math.round((grossP/totR)*100):0,netMarg=totR?Math.round((netP/totR)*100):0;
  $('content').innerHTML=`
  <div class="exc-bar" style="margin-bottom:12px">
    <span class="c-muted">Exchange rate:</span><span>USD 1 =</span>
    <input id="fxin" value="${FX.rate}" type="number" onchange="FX.rate=+this.value;saveDB();renderProfit()">
    <span>TZS</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px">
    <div class="metric" style="border-left:3px solid #3b82f6"><div class="lbl">USD True Revenue</div><div class="val" style="color:#1d4ed8">${fmtA(rU,'USD')}</div><div class="sub">Gross Profit: ${fmtA(rU-cU,'USD')}</div></div>
    <div class="metric" style="border-left:3px solid #06b6d4"><div class="lbl">TZS True Revenue</div><div class="val" style="color:#0e7490">${fmtA(rT,'TZS')}</div><div class="sub">Gross Profit: ${fmtA(rT-cT,'TZS')}</div></div>
    <div class="metric" style="border-left:3px solid #22c55e"><div class="lbl">Gross Profit (equiv.)</div><div class="val" style="color:#15803d">$${Math.round(grossP).toLocaleString()}</div><div class="pbar"><div class="pbar-fill" style="width:${marg}%;background:#22c55e"></div></div><div class="sub">${marg}% gross margin</div></div>
    <div class="metric" style="border-left:3px solid #a855f7"><div class="lbl">Net Profit (after expenses)</div><div class="val" style="color:${netP>=0?'#7e22ce':'#b91c1c'}">$${Math.round(netP).toLocaleString()}</div><div class="pbar"><div class="pbar-fill" style="width:${Math.max(0,netMarg)}%;background:#a855f7"></div></div><div class="sub">${netMarg}% · Expenses: $${Math.round(expUSD).toLocaleString()}</div></div>
  </div>
  <div class="two-col">
    <div class="card"><div class="card-title">Profit by invoice</div><table>
      <thead><tr><th>Invoice</th><th>Job Ref</th><th>Client</th><th>Cur</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>%</th></tr></thead>
      <tbody>${DB.invoices.map(i=>{
        const rv=invTrueRevenue(i),c=invTrueCost(i),p=rv-c,m=rv?Math.round((p/rv)*100):0;
        const pt=invAirPassthrough(i);
        return`<tr>
          <td>${i.id}</td><td style="font-size:11px;color:#888">${i.jobRef||'—'}</td>
          <td style="font-size:11px">${(cl(i.clientId).company||'').split(' ')[0]}</td>
          <td>${curBadge(i.currency)}</td>
          <td>${fmtA(rv,i.currency)}${pt?`<div style="font-size:10px;color:#aaa">+${fmtA(pt,i.currency)} pass-thru</div>`:''}</td>
          <td>${fmtA(c,i.currency)}</td><td class="c-green">${fmtA(p,i.currency)}</td><td>${m}%</td>
        </tr>`;}).join('')}</tbody>
    </table></div>
    <div class="card"><div class="card-title">Profit by service type</div><table>
      <thead><tr><th>Service</th><th>Cur</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>%</th></tr></thead>
      <tbody>${Object.entries(byType).flatMap(([t,v])=>{
        const rows=[];
        const isAir=t==='Air Tickets';
        const airNote=isAir?'<div style="font-size:10px;color:#aaa;font-style:italic">Service fees only (airfare excluded)</div>':'';
        if(v.rU>0||v.ptU>0){
          const p=v.rU-v.cU, m=v.rU?Math.round((p/v.rU)*100):0;
          rows.push(`<tr>
            <td><span class="badge b-gray">${t}</span>${airNote}</td>
            <td>${curBadge('USD')}</td>
            <td>${fmtA(v.rU,'USD')}${isAir&&v.ptU?`<div style="font-size:10px;color:#aaa">+${fmtA(v.ptU,'USD')} pass-thru</div>`:''}</td>
            <td>${fmtA(v.cU,'USD')}</td>
            <td class="c-green">${fmtA(p,'USD')}</td>
            <td>${m}%</td>
          </tr>`);
        }
        if(v.rT>0||v.ptT>0){
          const p=v.rT-v.cT, m=v.rT?Math.round((p/v.rT)*100):0;
          rows.push(`<tr>
            <td><span class="badge b-gray">${t}</span>${airNote}</td>
            <td>${curBadge('TZS')}</td>
            <td>${fmtA(v.rT,'TZS')}${isAir&&v.ptT?`<div style="font-size:10px;color:#aaa">+${fmtA(v.ptT,'TZS')} pass-thru</div>`:''}</td>
            <td>${fmtA(v.cT,'TZS')}</td>
            <td class="c-green">${fmtA(p,'TZS')}</td>
            <td>${m}%</td>
          </tr>`);
        }
        return rows;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}

// ── SOA ────────────────────────────────────────────────────────────────────────
function renderSOA() {
  $('content').innerHTML=`<div class="tab-bar">
    <span class="tab active" id="tab-cl" onclick="soaTab('cl')">Client Statements</span>
    <span class="tab" id="tab-sp" onclick="soaTab('sp')">Supplier Statements</span>
  </div><div id="soa-body"></div>`;
  soaTab('cl');
}
function soaTab(t) {
  ['cl','sp'].forEach(x=>$('tab-'+x).classList.toggle('active',x===t));
  if(t==='cl'){
    $('soa-body').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
      <thead><tr><th>Client</th><th>USD Invoiced</th><th>USD Paid</th><th>USD Balance</th><th>TZS Invoiced</th><th>TZS Paid</th><th>TZS Balance</th><th></th></tr></thead>
      <tbody>${DB.clients.map(c=>{
        const invs=DB.invoices.filter(i=>i.clientId===c.id);
        const uI=invs.filter(i=>i.currency==='USD').reduce((s,i)=>s+invTotal(i),0);
        const uP=invs.filter(i=>i.currency==='USD').reduce((s,i)=>s+i.paid,0);
        const tI=invs.filter(i=>i.currency==='TZS').reduce((s,i)=>s+invTotal(i),0);
        const tP=invs.filter(i=>i.currency==='TZS').reduce((s,i)=>s+i.paid,0);
        return`<tr>
          <td><div style="font-weight:500">${c.company}</div><div style="font-size:11px;color:#888">${c.contact}</div></td>
          <td>${fmtA(uI,'USD')}</td><td>${fmtA(uP,'USD')}</td>
          <td style="color:${uI-uP>0?'var(--red-text)':'var(--green-text)'}">${fmtA(uI-uP,'USD')}</td>
          <td>${fmtA(tI,'TZS')}</td><td>${fmtA(tP,'TZS')}</td>
          <td style="color:${tI-tP>0?'var(--red-text)':'var(--green-text)'}">${fmtA(tI-tP,'TZS')}</td>
          <td style="white-space:nowrap">
            <button class="btn sml" onclick="viewClientSOA('${c.id}','USD')">USD SOA</button>
            <button class="btn sml" onclick="viewClientSOA('${c.id}','TZS')">TZS SOA</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  } else {
    $('soa-body').innerHTML=`<div class="card"><div class="tbl-wrap"><table>
      <thead><tr><th>Supplier</th><th>Service</th><th>Cur</th><th>Total Billed</th><th>Paid</th><th>Balance</th><th></th></tr></thead>
      <tbody>${DB.suppliers.map(s=>{
        const sinvs=DB.supplierInvoices.filter(si=>si.supplierId===s.id);
        const tot=sinvs.reduce((a,si)=>a+si.amount,0),paid=sinvs.filter(si=>si.status==='Paid').reduce((a,si)=>a+si.amount,0),bal=tot-paid;
        return`<tr>
          <td><div style="font-weight:500">${s.company}</div><div style="font-size:11px;color:#888">${s.contact}</div></td>
          <td><span class="badge b-gray">${s.serviceType}</span></td>
          <td>${curBadge(s.currency)}</td>
          <td>${fmtA(tot,s.currency)}</td><td>${fmtA(paid,s.currency)}</td>
          <td style="color:${bal>0?'var(--red-text)':'var(--green-text)'}">${fmtA(bal,s.currency)}</td>
          <td><button class="btn sml" onclick="viewSupplierSOA('${s.id}')">Full SOA</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  }
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function renderSettings() {
  const s=DB.settings;
  const now=new Date();
  const bkName=`travelogue-backup-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.json`;
  $('content').innerHTML=`
  <div class="two-col">
    <div class="card"><div class="card-title">Company Profile</div>
      <div class="form-grid">
        <div class="field" style="grid-column:1/-1"><label>Company Name</label><input id="s-name" value="${esc(s.companyName)}"></div>
        <div class="field" style="grid-column:1/-1"><label>Address</label><textarea id="s-addr">${esc(s.address)}</textarea></div>
        <div class="field"><label>TIN Number</label><input id="s-tin" value="${s.tin}"></div>
        <div class="field"><label>VAT Number</label><input id="s-vat" value="${s.vat}"></div>
        <div class="field"><label>Phone</label><input id="s-phone" value="${s.phone}"></div>
        <div class="field"><label>Email</label><input id="s-email" value="${s.email}"></div>
      </div>
      <div style="margin-top:12px;text-align:right"><button class="btn pri" onclick="saveSettings()">Save Settings</button></div>
    </div>
    <div>
      <div class="card"><div class="card-title">Exchange Rate</div>
        <div class="exc-bar" style="margin-bottom:10px"><span>USD 1 =</span><input id="fxrate" value="${FX.rate}" type="number"><span>TZS</span></div>
        <p style="font-size:12px;color:#888;line-height:1.6">Used across Profit Tracker and Dashboard for USD equivalents.</p>
        <div style="margin-top:10px;text-align:right"><button class="btn pri" onclick="FX.rate=+$('fxrate').value;saveDB();alert('Rate updated to '+FX.rate+' TZS/USD')">Update Rate</button></div>
      </div>
      <div class="card"><div class="card-title">Service Types</div>
        <div id="svc-list" style="margin-bottom:10px">${(DB.serviceTypes||[]).map((t,i)=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="flex:1;font-size:13px">${t}</span>
            ${['Air Tickets','Hotel','Transfers'].includes(t)
              ? '<span style="font-size:11px;color:#aaa">core</span>'
              : `<button class="btn sml dan" onclick="deleteServiceType(${i})">Remove</button>`}
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <input id="new-svc" placeholder="New service type" style="flex:1;padding:6px 9px;font-size:13px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg);color:var(--text)">
          <button class="btn pri" onclick="addServiceType()">Add</button>
        </div>
      </div>
      <div class="card"><div class="card-title">Company Logo</div>
        <img src="logo.png" style="height:44px;width:auto;display:block;margin-bottom:8px" alt="Logo">
        <p style="font-size:12px;color:#888">Replace <strong>logo.png</strong> in the app folder to update.</p>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">App Security</div>
    <p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:12px">Change the password required to open the app. You will need your current password to set a new one.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="field"><label>Current Password</label><input type="password" id="pw-cur" placeholder="Current password"></div>
      <div class="field"><label>New Password</label><input type="password" id="pw-new" placeholder="New password"></div>
      <div class="field"><label>Confirm New Password</label><input type="password" id="pw-con" placeholder="Confirm password"></div>
    </div>
    <div id="pw-msg" style="font-size:12px;margin-bottom:8px"></div>
    <button class="btn pri" onclick="changePassword()">Change Password</button>
  </div>

  <div class="card">
    <div class="card-title">Backup &amp; Restore</div>
    <div class="two-col" style="gap:20px;align-items:start">
      <div>
        <p style="font-size:13px;font-weight:500;margin-bottom:5px">Export Backup</p>
        <p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:12px">Downloads all your data as a <strong>.json</strong> file. Save to USB, Google Drive, or email to yourself.</p>
        <button class="btn pri" onclick="exportBackup('${bkName}')">⬇ Download Backup</button>
        <p style="font-size:11px;color:#aaa;margin-top:8px">Filename: <em>${bkName}</em></p>
      </div>
      <div>
        <p style="font-size:13px;font-weight:500;margin-bottom:5px">Restore from Backup</p>
        <p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:12px">Select a <strong>.json</strong> backup file. <strong style="color:var(--red-text)">Replaces all current data.</strong></p>
        <label class="btn" style="cursor:pointer">⬆ Choose Backup File<input type="file" accept=".json" onchange="importBackup(event)" style="display:none"></label>
        <div id="restore-status" style="font-size:12px;margin-top:8px;color:#888"></div>
      </div>
    </div>
  </div>`;
}

function saveSettings() {
  DB.settings.companyName=$('s-name').value; DB.settings.address=$('s-addr').value;
  DB.settings.tin=$('s-tin').value; DB.settings.vat=$('s-vat').value;
  DB.settings.phone=$('s-phone').value; DB.settings.email=$('s-email').value;
  saveDB(); alert('Settings saved.');
}
function addServiceType() {
  const v=$('new-svc').value.trim(); if(!v) return;
  if(DB.serviceTypes.includes(v)){alert('Already exists.');return;}
  DB.serviceTypes.push(v); saveDB(); renderSettings();
}
function deleteServiceType(idx) {
  const t=DB.serviceTypes[idx];
  if(['Air Tickets','Hotel','Transfers'].includes(t)) return;
  if(confirm('Remove "'+t+'"?')){DB.serviceTypes.splice(idx,1);saveDB();renderSettings();}
}
function exportBackup(filename) {
  const payload={_version:1,_exported:new Date().toISOString(),_app:'Travelogue Tours BMS',fxRate:FX.rate,...DB};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function importBackup(event) {
  const file=event.target.files[0]; if(!file) return;
  const status=$('restore-status'); status.textContent='Reading…';
  const reader=new FileReader();
  reader.onload=function(e){
    try {
      const data=JSON.parse(e.target.result);
      if(!data.clients||!data.invoices){status.style.color='var(--red-text)';status.textContent='✕ Invalid backup file.';return;}
      if(!confirm('Restore backup from '+(data._exported?new Date(data._exported).toLocaleString():'unknown')+
        '?\n\n• '+data.clients.length+' client(s)\n• '+data.suppliers.length+' supplier(s)\n• '+data.invoices.length+
        ' invoice(s)\n• '+(data.purchaseOrders||[]).length+' PO(s)\n• '+(data.supplierInvoices||[]).length+
        ' supplier invoice(s)\n• '+(data.overheads||[]).length+' expense(s)\n\nThis replaces ALL current data.')) return;
      DB.settings=data.settings||DB.settings; DB.clients=data.clients||[]; DB.suppliers=data.suppliers||[];
      DB.invoices=data.invoices||[]; DB.purchaseOrders=data.purchaseOrders||[];
      DB.supplierInvoices=data.supplierInvoices||[]; DB.overheads=data.overheads||[];
      DB.serviceTypes=data.serviceTypes||DB.serviceTypes;
      if(data.fxRate) FX.rate=data.fxRate;
      // migrate payments
      DB.invoices.forEach(i=>{if(!i.payments)i.payments=[];});
      saveDB(); status.style.color='var(--green-text)'; status.textContent='✓ Restored successfully.';
      setTimeout(()=>nav('dashboard'),1200);
    } catch(err){status.style.color='var(--red-text)';status.textContent='✕ Could not read file.';}
  };
  reader.readAsText(file);
}

// ── HTML escape helper (prevents apostrophes breaking onclick) ────────────────
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Change Password ────────────────────────────────────────────────────────────
async function changePassword() {
  const cur=$('pw-cur').value, nw=$('pw-new').value, con=$('pw-con').value;
  const msg=$('pw-msg');
  if(!cur||!nw||!con){msg.style.color='var(--red-text)';msg.textContent='Please fill in all three fields.';return;}
  if(nw!==con){msg.style.color='var(--red-text)';msg.textContent='New passwords do not match.';return;}
  if(nw.length<6){msg.style.color='var(--red-text)';msg.textContent='Password must be at least 6 characters.';return;}
  // Verify current password
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cur));
  const curHash=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(curHash!==window._PW_HASH){msg.style.color='var(--red-text)';msg.textContent='Current password is incorrect.';return;}
  // Hash new password and save
  const buf2=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nw));
  const newHash=Array.from(new Uint8Array(buf2)).map(b=>b.toString(16).padStart(2,'0')).join('');
  localStorage.setItem('travelogue_pw',newHash);
  window._PW_HASH=newHash;
  msg.style.color='var(--green-text)';msg.textContent='✓ Password changed successfully.';
  $('pw-cur').value='';$('pw-new').value='';$('pw-con').value='';
}
