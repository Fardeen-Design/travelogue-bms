// js/helpers.js  —  utilities

const $ = id => document.getElementById(id);

function cl(id) { return DB.clients.find(c=>c.id===id) || {}; }
function sp(id) { return DB.suppliers.find(s=>s.id===id) || {}; }

function svcRevenue(sv) {
  if (sv.type==='Air Tickets') return (sv.passengers||[]).reduce((s,p)=>s+p.flightCost+p.serviceFee,0);
  return sv.sell || 0;
}
function svcCost(sv) {
  if (sv.type==='Air Tickets') return (sv.passengers||[]).reduce((s,p)=>s+p.flightCost,0);
  return sv.cost || 0;
}
function invTotal(inv)  { return (inv.services||[]).reduce((s,sv)=>s+svcRevenue(sv),0); }
function invCost(inv)   { return (inv.services||[]).reduce((s,sv)=>s+svcCost(sv),0); }
function poTotal(po)    { return (po.items||[]).reduce((s,x)=>s+x.total,0); }
function overheadTotalUSD() {
  return (DB.overheads||[]).reduce((s,e)=>s+(e.currency==='USD'?e.amount:e.amount/FX.rate),0);
}

function fmtD(d) {
  if (!d) return '—';
  const [y,m,dy] = d.split('-');
  return dy+'/'+m+'/'+y;
}
function fmtA(n, cur) {
  const v = Number(n)||0;
  return cur==='USD'
    ? '$'+v.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})
    : 'TZS '+Math.round(v).toLocaleString();
}
function curBadge(cur) {
  return `<span class="badge ${cur==='USD'?'b-usd':'b-tzs'}">${cur}</span>`;
}
function statusBadge(s) {
  const m={Paid:'b-ok',Partial:'b-warn',Unpaid:'b-danger',Billed:'b-info',Pending:'b-gray'};
  return `<span class="badge ${m[s]||'b-gray'}">${s}</span>`;
}
function nextId(arr, prefix) {
  // Find highest existing numeric suffix
  let max = 0;
  arr.forEach(x => {
    const n = parseInt((x.id||'').replace(/\D/g,''),10);
    if (!isNaN(n) && n>max) max=n;
  });
  return prefix + String(max+1).padStart(3,'0');
}
function today() { return new Date().toISOString().slice(0,10); }

// Modal helpers
function openModal(html) { $('modal').innerHTML=html; $('overlay').classList.add('open'); }
function closeModal()    { $('overlay').classList.remove('open'); }

// ── True P&L helpers (Air Tickets: service fee only; others: sell - buy) ───────
// These are used for Gross Profit calculations on Dashboard and Profit Tracker.
// invoiceTotal (invTotal) is still the full billing amount shown on the invoice.

function svcTrueRevenue(sv) {
  // Air Tickets: only the service fee is Travelogue revenue (airfare is pass-through)
  if (sv.type==='Air Tickets')
    return (sv.passengers||[]).reduce((s,p)=>s+p.serviceFee,0);
  // All other services: full sell price
  return sv.sell || 0;
}

function svcTrueCost(sv, invId) {
  // Air Tickets: cost = service fee paid to supplier on linked PO(s)
  if (sv.type==='Air Tickets') {
    // Find all POs linked to this invoice, Air Tickets type
    const linkedPOs = (DB.purchaseOrders||[]).filter(po=>po.invoiceRef===invId);
    const airPOitems = linkedPOs.flatMap(po=>
      (po.items||[]).filter(it=>it.type==='Air Tickets')
    );
    const poSFtotal = airPOitems.reduce((s,it)=>s+(it.serviceFee||0),0);
    // If PO service fees exist, use them; otherwise 0 (pass-through only)
    return poSFtotal;
  }
  // All other services: buy/cost price
  return sv.cost || 0;
}

function invTrueRevenue(inv) {
  return (inv.services||[]).reduce((s,sv)=>s+svcTrueRevenue(sv),0);
}

function invTrueCost(inv) {
  return (inv.services||[]).reduce((s,sv)=>s+svcTrueCost(sv,inv.id),0);
}

// Air pass-through amount (for display only — not revenue or cost)
function invAirPassthrough(inv) {
  return (inv.services||[])
    .filter(sv=>sv.type==='Air Tickets')
    .reduce((s,sv)=>(sv.passengers||[]).reduce((ss,p)=>ss+p.flightCost,s),0);
}

// ── PO status derived from linked supplier invoices ───────────────────────────
// Pending = no supplier invoice linked
// Billed  = supplier invoice exists but unpaid
// Paid    = all linked supplier invoices are paid
function poStatus(po) {
  const linked = (DB.supplierInvoices||[]).filter(si => si.poRef === po.id);
  if (!linked.length) return 'Pending';
  const allPaid = linked.every(si => si.status === 'Paid');
  return allPaid ? 'Paid' : 'Billed';
}
