// ── Amount in words ─────────────────────────────────────────────────────────
function amountInWords(amount, currency) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function words(n) {
    if(n===0) return '';
    if(n<20) return ones[n]+' ';
    if(n<100) return tens[Math.floor(n/10)]+' '+(ones[n%10]?ones[n%10]+' ':'');
    if(n<1000) return ones[Math.floor(n/100)]+' Hundred '+(n%100?words(n%100):'');
    if(n<1000000) return words(Math.floor(n/1000))+'Thousand '+(n%1000?words(n%1000):'');
    if(n<1000000000) return words(Math.floor(n/1000000))+'Million '+(n%1000000?words(n%1000000):'');
    return words(Math.floor(n/1000000000))+'Billion '+(n%1000000000?words(n%1000000000):'');
  }
  const rounded = Math.round(amount*100)/100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded-intPart)*100);
  const currName = currency==='USD' ? 'US Dollars' : 'Tanzania Shillings';
  const centName = currency==='USD' ? 'Cents' : 'Cents';
  let result = (words(intPart)||'Zero ')+currName;
  if(decPart>0) result += ' and '+(words(decPart)||'Zero ')+centName;
  return result.trim() + ' Only';
}

// js/views.js  —  view modals

function viewInvoice(id) {
  const inv=DB.invoices.find(i=>i.id===id);
  const c=cl(inv.clientId), cmp=DB.settings;
  const tot=invTotal(inv), grandTotal=tot*(1+(inv.vatRate||0)/100), bal=grandTotal-inv.paid;
  // True P&L: air tickets = service fee revenue/cost only (airfare is pass-through)
  const trueRev=invTrueRevenue(inv), trueCost=invTrueCost(inv), prof=trueRev-trueCost;
  const airPT=invAirPassthrough(inv);
  const marg=trueRev?Math.round((prof/trueRev)*100):0;
  // Resolve tripRef at display time: stored value → SI.tripRef → PO.tripRef
  let displayTripRef = inv.tripRef || '';
  if (!displayTripRef && inv.jobRef) {
    const si = DB.supplierInvoices.find(x => x.id === inv.jobRef);
    if (si) {
      displayTripRef = si.tripRef || '';
      if (!displayTripRef && si.poRef) {
        const po = DB.purchaseOrders.find(p => p.id === si.poRef);
        if (po) displayTripRef = po.tripRef || '';
      }
    }
  }

  // Icons and labels for each service type
  const svcIcons={'Air Tickets':'✈','Hotel':'🏨','Transfers':'🚗','Meals':'🍽','Visa Fees':'📋','Travel Insurance':'🛡','Extras':'⭐'};
  function svcIcon(t){return svcIcons[t]||'◆';}

  // Separate service fees to always render last
  const allSfRows=[];

  const mainRows=inv.services.map(sv=>{
    if(sv.type==='Air Tickets'){
      const totalServiceFee=(sv.passengers||[]).reduce((s,p)=>s+p.serviceFee,0);
      const hdr=`<tr style="background:#f3f2ee"><td style="padding:6px 8px;font-weight:700;font-size:12px;letter-spacing:0.02em">${svcIcon('Air Tickets')} Air Tickets</td><td></td><td></td><td style="padding:6px 8px;text-align:right;font-weight:700">${fmtA(svcRevenue(sv)-totalServiceFee,inv.currency)}</td></tr>`;
      const paxRows=(sv.passengers||[]).map(p=>`
        <tr style="background:#fafaf8"><td style="padding:4px 8px 4px 20px;font-size:11.5px"><span style="font-weight:600">${p.name}</span> &nbsp;<span style="color:#666;font-size:10.5px">PNR: ${p.pnr||'—'} &nbsp; ${p.from||'—'} → ${p.to||'—'} &nbsp; Dep: ${fmtD(p.dep)} Ret: ${fmtD(p.ret)}</span></td><td style="text-align:center;padding:4px 8px">1</td><td style="text-align:right;padding:4px 8px;white-space:nowrap">${fmtA(p.flightCost,inv.currency)}</td><td style="text-align:right;padding:4px 8px;white-space:nowrap">${fmtA(p.flightCost,inv.currency)}</td></tr>
      `).join('');
      // Collect service fee for end
      if(totalServiceFee>0){
        allSfRows.push(`<tr style="border-top:0.5px dashed #ddd;background:#fafaf8"><td style="padding:5px 8px 5px 20px;font-style:italic;color:#444">Service Fee (${sv.passengers.length} pax — Air Tickets)</td><td style="text-align:center;padding:5px 8px">${sv.passengers.length}</td><td style="text-align:right;padding:5px 8px;white-space:nowrap">${fmtA(totalServiceFee/sv.passengers.length,inv.currency)}</td><td style="text-align:right;padding:5px 8px;white-space:nowrap">${fmtA(totalServiceFee,inv.currency)}</td></tr>`);
      }
      return hdr+paxRows;
    } else {
      const qty=sv.qty||1, rate=sv.rate||0, sell=sv.sell||0;
      const extra=sv.checkin&&sv.checkout?`<span style="font-size:10px;color:#666;display:block">Check-in: ${fmtD(sv.checkin)} — Check-out: ${fmtD(sv.checkout)}</span>`:'';
      // Section header row with icon and bold label
      const hdr=`<tr style="background:#f3f2ee"><td style="padding:6px 8px;font-weight:700;font-size:12px">${svcIcon(sv.type)} ${sv.type}</td><td style="text-align:center;padding:6px 8px;font-weight:700">${qty}</td><td style="text-align:right;padding:6px 8px;white-space:nowrap;font-weight:700">${fmtA(rate,inv.currency)}</td><td style="text-align:right;padding:6px 8px;white-space:nowrap;font-weight:700">${fmtA(sell,inv.currency)}</td></tr>`;
      const desc=sv.desc?`<tr style="background:#fafaf8"><td style="padding:4px 8px 5px 20px;color:#444;font-size:11.5px" colspan="4">${sv.desc}${extra}</td></tr>`:'';
      return hdr+desc;
    }
  }).join('');

  const sfSection=allSfRows.length?`<tr style="background:#f3f2ee"><td colspan="4" style="padding:6px 8px;font-weight:700;font-size:12px">💼 Service Fees</td></tr>`+allSfRows.join(''):'';
  const svcRows=mainRows+sfSection;

  // payment history rows
  const pmtRows=(inv.payments||[]).length
    ? (inv.payments||[]).map(p=>`<tr><td>${fmtD(p.date)}</td><td>${fmtA(p.amount,inv.currency)}</td><td style="color:#888;font-size:12px">${p.note||'—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="color:#888;text-align:center;font-size:12px">No payments recorded</td></tr>';

  openModal(`<h2>Invoice ${inv.id}</h2>
  <div class="inv-doc" id="inv-print-area" style="padding:20px;font-size:11.5px;">
    <div class="inv-hdr" style="margin-bottom:12px;">
      <div>
        <img class="inv-logo" src="logo.png" alt="${cmp.companyName}">
        <div style="font-size:11px;color:#777;margin-top:5px">${cmp.address}</div>
        <div style="font-size:11px;color:#777">TIN: ${cmp.tin} &nbsp;|&nbsp; VAT: ${cmp.vat}</div>
        <div style="font-size:11px;color:#777">${cmp.phone} &nbsp;|&nbsp; ${cmp.email}</div>
      </div>
      <div class="inv-meta">
        <div style="font-size:20px;font-weight:600;color:#1a1a1a">INVOICE</div>
        <div style="margin-top:6px">No: <strong>${inv.id}</strong></div>
        ${inv.jobRef?`<div style="font-size:12px;color:#555">Ref: <strong>${inv.jobRef}</strong></div>`:''}
        ${displayTripRef?`<div style="font-size:11px;color:#185fa5;margin-top:1px">Trip: <strong>${displayTripRef}</strong></div>`:''}
        <div style="margin-top:4px">Date: ${fmtD(inv.date)}</div>
        <div>Due: ${fmtD(inv.due)}</div>
        <div style="margin-top:5px">${curBadge(inv.currency)}</div>
      </div>
    </div>
    <div class="inv-parties" style="margin-bottom:10px;">
      <div class="inv-party">
        <div class="lbl">Bill To</div>
        <div style="font-weight:500;margin-top:3px">${c.company}</div>
        <div>${c.contact}</div>
        <div style="color:#777">${c.email}</div>
        <div style="color:#777">${c.address}</div>
        ${c.tin?`<div style="font-size:11px;color:#999;margin-top:3px">TIN: ${c.tin}${c.vat?' | VAT: '+c.vat:''}</div>`:''}
      </div>
      <div class="inv-party">
        <div class="lbl">Payment Details</div>
        <div style="margin-top:3px;color:#555">Please remit by <strong>${fmtD(inv.due)}</strong></div>
        <div style="margin-top:4px;color:#555">Currency: <strong>${inv.currency}</strong></div>
      </div>
    </div>
    <table>
      <thead><tr><th style="width:50%">Description</th><th style="width:15%;text-align:center">Qty</th><th style="width:17.5%;text-align:right">Rate</th><th style="width:17.5%;text-align:right">Amount (${inv.currency})</th></tr></thead>
      <tbody>${svcRows}</tbody>
    </table>
    <div class="totals">
      <div class="t-row"><span style="color:#888">Subtotal</span><span>${fmtA(tot,inv.currency)}</span></div>
      ${(inv.vatRate||0)>0?`<div class="t-row"><span style="color:#888">VAT (${inv.vatRate}%)</span><span>${fmtA(tot*(inv.vatRate/100),inv.currency)}</span></div>`:''}
      <div class="t-row t-grand"><span>Total${(inv.vatRate||0)>0?' (incl. VAT)':''}</span><span>${fmtA(grandTotal,inv.currency)}</span></div>
    </div>
    <div style="margin-top:10px;padding:8px 10px;background:#f7f6f2;border-radius:4px;font-size:11px;color:#555;font-style:italic">
      Amount in Words: <strong>${amountInWords(grandTotal,inv.currency)}</strong>
    </div>
    <div style="margin-top:14px;padding:10px 12px;background:#f0f4f8;border-radius:4px;font-size:11px;color:#333;border-left:3px solid #185fa5">
      <div style="font-weight:600;margin-bottom:5px;font-size:12px">Bank Details:</div>
      <div>Account Name: Travelogue Tours</div>
      <div>Account Number: USD 0153459002 | TZS 0153459001</div>
      <div>Bank Name: Diamond Trust Bank Tanzania Limited</div>
      <div>Branch: Upanga</div>
      <div>Swift code: DTKETZTZ</div>
    </div>
    <div class="footer-note" style="margin-top:12px">Thank you for your business — ${cmp.companyName} &nbsp;|&nbsp; ${cmp.email}</div>
  </div>
  <div class="no-print" style="margin-top:12px;padding:10px 12px;background:var(--bg2);border-radius:var(--radius);font-size:12px">
    <div style="font-weight:500;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#888">Internal — P&amp;L (not printed)</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px">
      <div><div style="font-size:10px;color:#aaa;margin-bottom:2px">True Revenue</div><div style="font-weight:500">${fmtA(trueRev,inv.currency)}</div></div>
      <div><div style="font-size:10px;color:#aaa;margin-bottom:2px">True Cost</div><div style="font-weight:500">${fmtA(trueCost,inv.currency)}</div></div>
      <div><div style="font-size:10px;color:#aaa;margin-bottom:2px">Gross Profit</div><div style="font-weight:500;color:var(--green-text)">${fmtA(prof,inv.currency)} <span class="profit-pill" style="font-size:10px">${marg}%</span></div></div>
    </div>
    ${airPT>0?`<div style="font-size:11px;color:#888;padding-top:6px;border-top:0.5px solid var(--border)">✈ Air fare pass-through (excluded from P&L): ${fmtA(airPT,inv.currency)}</div>`:''}
  </div>
  <div class="no-print" style="margin-top:12px">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px">Payment History</div>
    <table><thead><tr><th>Date</th><th>Amount</th><th>Note</th></tr></thead><tbody>${pmtRows}</tbody></table>
  </div>
  <div class="mfooter no-print">
    <button class="btn" onclick="closeModal()">Close</button>
    <button class="btn" onclick="printInvoice()">Print</button>
    <button class="btn" onclick="recordPayment('${id}')">Record Payment</button>
  </div>`);
}

function printInvoice() {
  const style=document.createElement('style');
  style.id='print-override';
  // Hide everything in modal except the invoice doc; also hide #content (the table row behind the modal)
  style.textContent=`@media print {
    #content, #topbar, #sidebar { display:none!important; }
    #modal > *:not(#inv-print-area) { display:none!important; }
    #overlay { position:static!important; background:none!important; padding:0!important; display:block!important; }
    #modal { border:none!important; padding:0!important; max-height:none!important; box-shadow:none!important; width:100%!important; max-width:100%!important; }
    #app { display:block!important; height:auto!important; overflow:visible!important; }
  }`;
  document.head.appendChild(style);
  window.print();
  setTimeout(()=>{ const el=document.getElementById('print-override'); if(el) el.remove(); },1200);
}

function viewPO(id) {
  const po=DB.purchaseOrders.find(p=>p.id===id);
  const s=sp(po.supplierId), cmp=DB.settings, t=poTotal(po);
  openModal(`<h2>Purchase Order ${po.id}</h2>
  <div class="po-doc">
    <div class="po-hdr">
      <div>
        <img class="po-logo" src="logo.png" alt="${cmp.companyName}">
        <div style="font-size:11px;color:#777;margin-top:3px">${cmp.address}</div>
        <div style="font-size:11px;color:#777">TIN: ${cmp.tin} | VAT: ${cmp.vat}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:600">PURCHASE ORDER</div>
        <div style="font-size:12px;color:#555;margin-top:6px">PO #: <strong>${po.id}</strong></div>
        <div style="font-size:12px;color:#555">Date: ${fmtD(po.date)}</div>
        <div style="margin-top:4px">${curBadge(po.currency)} ${statusBadge(poStatus(po))}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div style="background:#f7f6f2;padding:10px 12px;border-radius:5px">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Supplier</div>
        <div style="font-weight:500">${s.company}</div>
        <div style="font-size:12px;color:#555">${s.contact} &nbsp; ${s.email}</div>
        <div style="font-size:12px;color:#555">${s.address}</div>
      </div>
      <div style="background:#f7f6f2;padding:10px 12px;border-radius:5px">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Linked Invoice</div>
        <div style="font-weight:500">${po.invoiceRef||'—'}</div>
        ${po.tripRef?`<div style="font-size:11px;color:#185fa5;margin-top:4px;font-weight:500">Trip Ref: ${po.tripRef}</div>`:''}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#f0efe8">
        <th style="padding:7px 8px;text-align:left">Description</th>
        <th style="padding:7px 8px;text-align:left">Type</th>
        <th style="padding:7px 8px;text-align:center">Qty</th>
        <th style="padding:7px 8px;text-align:right">Unit Cost</th>
        <th style="padding:7px 8px;text-align:right">Amount</th>
      </tr></thead>
      <tbody>${(po.items||[]).map(it=>`<tr>
        <td style="padding:7px 8px;border-bottom:0.5px solid #e8e7df">${it.desc}</td>
        <td style="padding:7px 8px;border-bottom:0.5px solid #e8e7df"><span style="background:#f0f0e8;padding:2px 6px;border-radius:3px;font-size:11px">${it.type}</span></td>
        <td style="padding:7px 8px;border-bottom:0.5px solid #e8e7df;text-align:center">${it.qty}</td>
        <td style="padding:7px 8px;border-bottom:0.5px solid #e8e7df;text-align:right;white-space:nowrap">${fmtA(it.unit,po.currency)}</td>
        <td style="padding:7px 8px;border-bottom:0.5px solid #e8e7df;text-align:right;white-space:nowrap">${fmtA(it.total+(it.serviceFee||0),po.currency)}</td>
      </tr>`).join('')}</tbody>
    </table>
    ${(()=>{
      const sfTotal=(po.items||[]).reduce((s,it)=>s+(it.serviceFee||0),0);
      const vatOnSF=sfTotal*((po.vatRate||0)/100);
      const grandTotal=t+sfTotal+vatOnSF;
      return `<div style="text-align:right;margin-top:12px;font-size:13px">
        <div style="color:#888">Subtotal: ${fmtA(t+sfTotal,po.currency)}</div>
        ${(po.vatRate||0)>0&&sfTotal>0?`<div style="color:#888">VAT on Service Fees (${po.vatRate}%): ${fmtA(vatOnSF,po.currency)}</div>`:''}
        <div style="font-size:15px;font-weight:600;margin-top:6px;border-top:0.5px solid #e8e7df;padding-top:6px">Total: ${fmtA(grandTotal,po.currency)}</div>
      </div>`;
    })()}
    <div style="margin-top:12px;text-align:center;font-size:11px;color:#aaa;border-top:0.5px solid #e8e7df;padding-top:10px">${cmp.companyName} &nbsp;|&nbsp; ${cmp.address}</div>
  </div>
  <div class="mfooter no-print">
    <button class="btn" onclick="closeModal()">Close</button>
    <button class="btn" onclick="printPO()">Print</button>
    <button class="btn" onclick="editPO('${id}')">Edit</button>
    <button class="btn pri" onclick="copyPOtoSInv('${id}')">⬇ Copy to Supplier Invoice</button>
  </div>`);
}

function copyPOtoSInv(poId) {
  const po = DB.purchaseOrders.find(p=>p.id===poId);
  if (!po) return;
  const sfTotal = (po.items||[]).reduce((s,it)=>s+(it.serviceFee||0),0);
  const vatOnSF = sfTotal*((po.vatRate||0)/100);
  const total = poTotal(po) + sfTotal + vatOnSF;
  if (!confirm('Create a Supplier Invoice from '+po.id+'?\nSupplier: '+sp(po.supplierId).company+'\nAmount: '+fmtA(total,po.currency)+'\n\nThis will open the supplier invoice form pre-filled.')) return;
  closeModal();
  // Pre-fill and open supplier invoice form
  _buildSInvFormFromPO(po, total);
}

function _buildSInvFormFromPO(po, total) {
  const supOpts = DB.suppliers.map(s=>`<option value="${s.id}" ${po.supplierId===s.id?'selected':''}>${esc(s.company)} (${s.currency})</option>`).join('');
  const poOpts = '<option value="">— None —</option>'+DB.purchaseOrders.map(p=>`<option value="${p.id}" ${p.id===po.id?'selected':''}>${p.id}${p.tripRef?' ['+p.tripRef+']':''} — ${sp(p.supplierId).company}</option>`).join('');
  openModal(`<h2>New Supplier Invoice (from ${po.id})</h2>
  <div class="form-grid">
    <div class="field"><label>Supplier *</label><select id="fsi-sup">${supOpts}</select></div>
    <div class="field"><label>Currency</label><select id="fsi-cur"><option value="USD" ${po.currency==='USD'?'selected':''}>USD</option><option value="TZS" ${po.currency==='TZS'?'selected':''}>TZS</option></select></div>
    <div class="field"><label>Invoice Date</label><input type="date" id="fsi-dt" value="${today()}"></div>
    <div class="field"><label>Amount *</label><input type="number" id="fsi-amt" value="${total.toFixed(2)}"></div>
    <div class="field" style="grid-column:1/-1"><label>Linked PO</label><select id="fsi-po">${poOpts}</select></div>
    <div class="field" style="grid-column:1/-1">
      <label>Trip / Job Reference</label>
      <input id="fsi-ref" value="${po.tripRef||''}" placeholder="Carried from PO">
      ${po.tripRef?'<div style="font-size:10px;color:#185fa5;margin-top:3px">✓ Carried from '+po.id+': '+po.tripRef+'</div>':''}
    </div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="saveNewSInv()">Save Supplier Invoice</button>
  </div>`);
}

function printPO() {
  const style=document.createElement('style');
  style.id='print-override';
  style.textContent=`@media print {
    #content, #topbar, #sidebar { display:none!important; }
    #modal > h2 { display:none!important; }
    .no-print { display:none!important; }
    #overlay { position:static!important; background:none!important; padding:0!important; display:block!important; }
    #modal { border:none!important; padding:0!important; max-height:none!important; box-shadow:none!important; width:100%!important; max-width:100%!important; }
    #app { display:block!important; height:auto!important; overflow:visible!important; }
  }`;
  document.head.appendChild(style);
  window.print();
  setTimeout(()=>{ const el=document.getElementById('print-override'); if(el) el.remove(); },1200);
}

function viewSInv(id) {
  const si=DB.supplierInvoices.find(x=>x.id===id);
  const s=sp(si.supplierId), cmp=DB.settings;
  const po=DB.purchaseOrders.find(p=>p.id===si.poRef);
  openModal(`<h2>Supplier Invoice ${si.id}</h2>
  <div class="po-doc">
    <div class="po-hdr">
      <div>
        <img class="po-logo" src="logo.png" alt="${cmp.companyName}">
        <div style="font-size:11px;color:#777;margin-top:3px">${cmp.address}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:600">SUPPLIER INVOICE</div>
        <div style="font-size:12px;color:#555;margin-top:6px">Ref: <strong>${si.id}</strong></div>
        <div style="font-size:12px;color:#555">Date: ${fmtD(si.date)}</div>
        <div style="margin-top:4px">${curBadge(si.currency)} ${statusBadge(si.status)}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div style="background:#f7f6f2;padding:10px 12px;border-radius:5px">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Supplier</div>
        <div style="font-weight:500">${s.company}</div>
        <div style="font-size:12px;color:#555">${s.contact} &nbsp; ${s.email}</div>
        <div style="font-size:12px;color:#555">${s.address}</div>
      </div>
      <div style="background:#f7f6f2;padding:10px 12px;border-radius:5px">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Linked PO</div>
        <div style="font-weight:500">${si.poRef||'—'}</div>
        ${po?`<div style="font-size:12px;color:#555;margin-top:3px">Client Invoice: ${po.invoiceRef||'—'}</div>`:''}
        ${si.tripRef?`<div style="font-size:11px;color:#185fa5;margin-top:4px;font-weight:500">Trip Ref: ${si.tripRef}</div>`:''}
      </div>
    </div>
    <div style="background:#f7f6f2;padding:14px;border-radius:5px;text-align:center">
      <div style="font-size:12px;color:#888;margin-bottom:4px">Invoice Amount</div>
      <div style="font-size:24px;font-weight:600;color:#1a1a1a">${fmtA(si.amount,si.currency)}</div>
      <div style="margin-top:8px">${statusBadge(si.status)}</div>
    </div>
    <div style="margin-top:12px;text-align:center;font-size:11px;color:#aaa;border-top:0.5px solid #e8e7df;padding-top:10px">${cmp.companyName}</div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Close</button>
    <button class="btn" onclick="editSInv('${id}')">Edit</button>
    <button class="btn pri" onclick="markSIPaid('${id}')">${si.status==='Paid'?'✓ Already Paid':'Mark as Paid'}</button>
  </div>`);
}

function viewClient(id) {
  const c=DB.clients.find(x=>x.id===id);
  const invs=DB.invoices.filter(i=>i.clientId===id);
  openModal(`<h2>${c.company}</h2>
  <div class="detail-grid">
    <div class="dfield"><div class="dl">Client ID</div><div class="dv">${c.id}</div></div>
    <div class="dfield"><div class="dl">Contact</div><div class="dv">${c.contact}</div></div>
    <div class="dfield"><div class="dl">Email</div><div class="dv">${c.email}</div></div>
    <div class="dfield"><div class="dl">Phone</div><div class="dv">${c.phone}</div></div>
    <div class="dfield" style="grid-column:1/-1"><div class="dl">Address</div><div class="dv">${c.address}</div></div>
    <div class="dfield"><div class="dl">TIN</div><div class="dv">${c.tin||'—'}</div></div>
    <div class="dfield"><div class="dl">VAT</div><div class="dv">${c.vat||'—'}</div></div>
  </div>
  <div style="margin-top:14px">
    <div class="card-title" style="margin-bottom:7px">Invoices (${invs.length})</div>
    <table><thead><tr><th>Invoice</th><th>Date</th><th>Cur</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>${invs.map(i=>`<tr><td>${i.id}</td><td>${fmtD(i.date)}</td><td>${curBadge(i.currency)}</td><td>${fmtA(invTotal(i),i.currency)}</td><td>${statusBadge(i.status)}</td></tr>`).join('')||'<tr><td colspan="5" style="color:#888;text-align:center">No invoices</td></tr>'}</tbody></table>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Close</button>
    <button class="btn" onclick="editClient('${id}')">Edit</button>
    <button class="btn pri" onclick="viewClientSOA('${id}','USD')">USD SOA</button>
    <button class="btn pri" onclick="viewClientSOA('${id}','TZS')">TZS SOA</button>
  </div>`);
}

function viewSupplier(id) {
  const s=DB.suppliers.find(x=>x.id===id);
  const sinvs=DB.supplierInvoices.filter(si=>si.supplierId===id);
  openModal(`<h2>${s.company}</h2>
  <div class="detail-grid">
    <div class="dfield"><div class="dl">Supplier ID</div><div class="dv">${s.id}</div></div>
    <div class="dfield"><div class="dl">Service Type</div><div class="dv"><span class="badge b-gray">${s.serviceType}</span></div></div>
    <div class="dfield"><div class="dl">Contact</div><div class="dv">${s.contact}</div></div>
    <div class="dfield"><div class="dl">Currency</div><div class="dv">${curBadge(s.currency)}</div></div>
    <div class="dfield"><div class="dl">Email</div><div class="dv">${s.email}</div></div>
    <div class="dfield"><div class="dl">Phone</div><div class="dv">${s.phone}</div></div>
    <div class="dfield" style="grid-column:1/-1"><div class="dl">Address</div><div class="dv">${s.address}</div></div>
    <div class="dfield"><div class="dl">TIN</div><div class="dv">${s.tin||'—'}</div></div>
    <div class="dfield"><div class="dl">VAT</div><div class="dv">${s.vat||'—'}</div></div>
  </div>
  <div style="margin-top:14px">
    <div class="card-title" style="margin-bottom:7px">Invoices Received (${sinvs.length})</div>
    <table><thead><tr><th>Ref #</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>${sinvs.map(si=>`<tr><td>${si.id}</td><td>${fmtD(si.date)}</td><td>${fmtA(si.amount,si.currency)}</td><td>${statusBadge(si.status)}</td></tr>`).join('')||'<tr><td colspan="4" style="color:#888;text-align:center">No invoices</td></tr>'}</tbody></table>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Close</button>
    <button class="btn" onclick="editSupplier('${id}')">Edit</button>
    <button class="btn pri" onclick="viewSupplierSOA('${id}')">View SOA</button>
  </div>`);
}

function viewExpense(id) {
  const e=(DB.overheads||[]).find(x=>x.id===id); if(!e) return;
  openModal(`<h2>Expense ${e.id}</h2>
  <div class="detail-grid">
    <div class="dfield"><div class="dl">Date</div><div class="dv">${fmtD(e.date)}</div></div>
    <div class="dfield"><div class="dl">Category</div><div class="dv"><span class="badge b-gray">${e.category}</span></div></div>
    <div class="dfield" style="grid-column:1/-1"><div class="dl">Description</div><div class="dv">${e.description}</div></div>
    <div class="dfield"><div class="dl">Currency</div><div class="dv">${curBadge(e.currency)}</div></div>
    <div class="dfield"><div class="dl">Amount</div><div class="dv c-red">${fmtA(e.amount,e.currency)}</div></div>
    <div class="dfield" style="grid-column:1/-1"><div class="dl">Receipt / Reference</div><div class="dv">${e.ref||'—'}</div></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Close</button>
    <button class="btn pri" onclick="editExpense('${id}')">Edit</button>
  </div>`);
}

function viewClientSOA(cid, filterCur) {
  const c=DB.clients.find(x=>x.id===cid);
  const allInvs=DB.invoices.filter(i=>i.clientId===cid);
  const invs=filterCur?allInvs.filter(i=>i.currency===filterCur):allInvs;
  const cur=filterCur||'Mixed';
  const tot=invs.reduce((s,i)=>s+invTotal(i),0), paid=invs.reduce((s,i)=>s+i.paid,0), bal=tot-paid;

  // Build transaction lines: invoice + all payments interleaved chronologically
  const lines=[];
  invs.forEach(i=>{
    lines.push({date:i.date,type:'Invoice',ref:i.id,jobRef:i.jobRef||'—',debit:invTotal(i),credit:0,inv:i});
    (i.payments||[]).forEach(p=>{lines.push({date:p.date,type:'Payment',ref:i.id,jobRef:'',debit:0,credit:p.amount,note:p.note||''});});
  });
  lines.sort((a,b)=>a.date.localeCompare(b.date));

  // running balance
  let run=0;
  const trows=lines.map(l=>{
    run+=l.debit-l.credit;
    const typeCell=l.type==='Invoice'
      ?`<span class="badge b-info">${l.type}</span>`
      :`<span class="badge b-ok">${l.type}</span>`;
    return`<tr>
      <td>${fmtD(l.date)}</td><td>${typeCell}</td>
      <td>${l.ref}${l.jobRef&&l.jobRef!=='—'?' ('+l.jobRef+')':''}</td>
      <td>${l.note||''}</td>
      <td style="text-align:right">${l.debit?fmtA(l.debit,cur==='Mixed'?invs.find(i=>i.id===l.ref)?.currency||'TZS':cur):'—'}</td>
      <td style="text-align:right">${l.credit?fmtA(l.credit,cur==='Mixed'?invs.find(i=>i.id===l.ref)?.currency||'TZS':cur):'—'}</td>
      <td style="text-align:right;color:${run>0?'var(--red-text)':'var(--green-text)'}">${fmtA(Math.abs(run),filterCur||'TZS')}</td>
    </tr>`;
  }).join('');

  openModal(`<h2>${filterCur?filterCur+' ':''} Statement — ${c.company}</h2>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
    <div><img src="logo.png" style="height:30px;width:auto;display:block;margin-bottom:4px"><div style="font-size:12px;color:#888">${DB.settings.companyName}</div></div>
    <div style="text-align:right;font-size:12px"><div style="font-weight:500">${c.company}</div><div style="color:#888">${c.address}</div><div style="color:#888">As of ${new Date().toLocaleDateString('en-GB')}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Note</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead>
    <tbody>${trows||'<tr><td colspan="7" style="color:#888;text-align:center;padding:14px">No transactions</td></tr>'}</tbody>
  </table>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px">
    <div style="padding:10px;background:var(--bg2);border-radius:var(--radius);font-size:12px"><div class="c-muted">Total Invoiced</div><div style="font-weight:500;margin-top:3px">${fmtA(tot,filterCur||'TZS')}</div></div>
    <div style="padding:10px;background:var(--bg2);border-radius:var(--radius);font-size:12px"><div class="c-muted">Total Paid</div><div style="font-weight:500;margin-top:3px">${fmtA(paid,filterCur||'TZS')}</div></div>
    <div style="padding:10px;background:var(--bg2);border-radius:var(--radius);font-size:12px"><div class="c-muted">Balance Due</div><div style="font-weight:500;margin-top:3px;color:${bal>0?'var(--red-text)':'var(--green-text)'}">${fmtA(bal,filterCur||'TZS')}</div></div>
  </div>
  <div class="mfooter"><button class="btn" onclick="closeModal()">Close</button><button class="btn" onclick="window.print()">Print</button></div>`);
}

function viewSupplierSOA(sid) {
  const s=DB.suppliers.find(x=>x.id===sid);
  const sinvs=DB.supplierInvoices.filter(si=>si.supplierId===sid);
  const tot=sinvs.reduce((a,si)=>a+si.amount,0);
  const paid=sinvs.filter(si=>si.status==='Paid').reduce((a,si)=>a+si.amount,0);
  openModal(`<h2>Supplier Statement — ${s.company}</h2>
  <div style="display:flex;justify-content:space-between;margin-bottom:14px">
    <div><img src="logo.png" style="height:30px;width:auto;display:block;margin-bottom:4px"><div style="font-size:12px;color:#888">${DB.settings.companyName}</div></div>
    <div style="text-align:right;font-size:12px"><div style="font-weight:500">${s.company}</div><div style="color:#888">${s.serviceType} | ${s.currency}</div><div style="color:#888">As of ${new Date().toLocaleDateString('en-GB')}</div></div>
  </div>
  <table>
    <thead><tr><th>Ref #</th><th>Date</th><th>PO Ref</th><th style="text-align:right">Amount</th><th>Status</th></tr></thead>
    <tbody>${sinvs.map(si=>`<tr><td>${si.id}</td><td>${fmtD(si.date)}</td><td class="c-muted">${si.poRef||'—'}</td><td style="text-align:right">${fmtA(si.amount,si.currency)}</td><td>${statusBadge(si.status)}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#888">No invoices</td></tr>'}</tbody>
  </table>
  <div style="text-align:right;margin-top:12px;font-size:13px">
    <div class="c-muted">Total Billed: ${fmtA(tot,s.currency)}</div>
    <div class="c-muted">Total Paid: ${fmtA(paid,s.currency)}</div>
    <div style="font-weight:500;margin-top:4px;color:${tot-paid>0?'var(--red-text)':'var(--green-text)'}">Balance Owed: ${fmtA(tot-paid,s.currency)}</div>
  </div>
  <div class="mfooter"><button class="btn" onclick="closeModal()">Close</button><button class="btn" onclick="window.print()">Print</button></div>`);
}

// esc is defined in renders.js and shared globally
