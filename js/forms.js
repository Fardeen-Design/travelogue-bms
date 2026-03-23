// js/forms.js  —  all form dialogs & save logic

// ── service type dropdown ──────────────────────────────────────────────────────
function svcTypeSelect(cls, selected) {
  selected = selected || '';
  const types = DB.serviceTypes || ['Air Tickets','Hotel','Transfers'];
  const opts = types.map(t=>`<option value="${t}" ${t===selected?'selected':''}>${t}</option>`).join('');
  return `<select class="${cls}" onchange="handleSvcTypeOther(this)">${opts}<option value="__other__">Other…</option></select>`;
}
function handleSvcTypeOther(sel) {
  if (sel.value !== '__other__') return;
  const v = prompt('Enter new service type:');
  if (v && v.trim()) {
    if (!DB.serviceTypes.includes(v.trim())) { DB.serviceTypes.push(v.trim()); saveDB(); }
    const opt = document.createElement('option');
    opt.value = v.trim(); opt.textContent = v.trim();
    sel.insertBefore(opt, sel.querySelector('[value="__other__"]'));
    sel.value = v.trim();
  } else { sel.value = DB.serviceTypes[0]; }
}

// ── CLIENT ─────────────────────────────────────────────────────────────────────
function openClientForm() {
  openModal(`<h2>New Client</h2>
  <div class="form-grid">
    <div class="field" style="grid-column:1/-1"><label>Company Name *</label><input id="f-co" placeholder="Acme Travel Ltd"></div>
    <div class="field"><label>Contact Person *</label><input id="f-ct" placeholder="Full name"></div>
    <div class="field"><label>Phone</label><input id="f-ph" placeholder="+255 ..."></div>
    <div class="field"><label>Email</label><input id="f-em" type="email" placeholder="email@company.com"></div>
    <div class="fsec">Address &amp; Tax</div>
    <div class="field" style="grid-column:1/-1"><label>Physical Address</label><textarea id="f-ad"></textarea></div>
    <div class="field"><label>TIN Number</label><input id="f-tin" placeholder="100-XXX-XXX"></div>
    <div class="field"><label>VAT Number</label><input id="f-vat" placeholder="40-XXXXXX-X"></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="saveNewClient()">Save Client</button>
  </div>`);
}
function editClient(id) {
  const c = DB.clients.find(x=>x.id===id); if(!c) return;
  closeModal();
  openModal(`<h2>Edit Client</h2>
  <div class="form-grid">
    <div class="field" style="grid-column:1/-1"><label>Company Name *</label><input id="f-co" value="${esc(c.company)}"></div>
    <div class="field"><label>Contact Person *</label><input id="f-ct" value="${esc(c.contact)}"></div>
    <div class="field"><label>Phone</label><input id="f-ph" value="${esc(c.phone)}"></div>
    <div class="field"><label>Email</label><input id="f-em" type="email" value="${esc(c.email)}"></div>
    <div class="fsec">Address &amp; Tax</div>
    <div class="field" style="grid-column:1/-1"><label>Physical Address</label><textarea id="f-ad">${esc(c.address)}</textarea></div>
    <div class="field"><label>TIN Number</label><input id="f-tin" value="${c.tin||''}"></div>
    <div class="field"><label>VAT Number</label><input id="f-vat" value="${c.vat||''}"></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="saveEditClient('${id}')">Update Client</button>
  </div>`);
}
function saveNewClient() {
  const co=$('f-co').value.trim(), ct=$('f-ct').value.trim();
  if(!co||!ct){alert('Company name and contact person are required.');return;}
  DB.clients.push({id:nextId(DB.clients,'CL'),company:co,contact:ct,phone:$('f-ph').value,email:$('f-em').value,address:$('f-ad').value,tin:$('f-tin').value,vat:$('f-vat').value});
  saveDB(); closeModal(); renderClients();
}
function saveEditClient(id) {
  const co=$('f-co').value.trim(), ct=$('f-ct').value.trim();
  if(!co||!ct){alert('Company name and contact person are required.');return;}
  Object.assign(DB.clients.find(x=>x.id===id),{company:co,contact:ct,phone:$('f-ph').value,email:$('f-em').value,address:$('f-ad').value,tin:$('f-tin').value,vat:$('f-vat').value});
  saveDB(); closeModal(); renderClients();
}

// ── SUPPLIER ──────────────────────────────────────────────────────────────────
function openSupplierForm() {
  const types = DB.serviceTypes||['Air Tickets','Hotel','Transfers'];
  openModal(`<h2>New Supplier</h2>
  <div class="form-grid">
    <div class="field" style="grid-column:1/-1"><label>Company Name *</label><input id="fs-co"></div>
    <div class="field"><label>Contact Person</label><input id="fs-ct"></div>
    <div class="field"><label>Phone</label><input id="fs-ph"></div>
    <div class="field"><label>Email</label><input id="fs-em" type="email"></div>
    <div class="field" style="grid-column:1/-1"><label>Physical Address</label><textarea id="fs-ad"></textarea></div>
    <div class="fsec">Tax &amp; Service</div>
    <div class="field"><label>TIN Number</label><input id="fs-tin"></div>
    <div class="field"><label>VAT Number</label><input id="fs-vat"></div>
    <div class="field"><label>Service Type</label><select id="fs-st">${types.map(t=>`<option>${t}</option>`).join('')}</select></div>
    <div class="field"><label>Billing Currency</label><select id="fs-cur"><option value="USD">USD</option><option value="TZS">TZS</option></select></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="saveNewSupplier()">Save Supplier</button>
  </div>`);
}
function editSupplier(id) {
  const s = DB.suppliers.find(x=>x.id===id); if(!s) return;
  const types = DB.serviceTypes||['Air Tickets','Hotel','Transfers'];
  closeModal();
  openModal(`<h2>Edit Supplier</h2>
  <div class="form-grid">
    <div class="field" style="grid-column:1/-1"><label>Company Name *</label><input id="fs-co" value="${esc(s.company)}"></div>
    <div class="field"><label>Contact Person</label><input id="fs-ct" value="${esc(s.contact)}"></div>
    <div class="field"><label>Phone</label><input id="fs-ph" value="${esc(s.phone)}"></div>
    <div class="field"><label>Email</label><input id="fs-em" type="email" value="${esc(s.email)}"></div>
    <div class="field" style="grid-column:1/-1"><label>Physical Address</label><textarea id="fs-ad">${esc(s.address)}</textarea></div>
    <div class="fsec">Tax &amp; Service</div>
    <div class="field"><label>TIN Number</label><input id="fs-tin" value="${s.tin||''}"></div>
    <div class="field"><label>VAT Number</label><input id="fs-vat" value="${s.vat||''}"></div>
    <div class="field"><label>Service Type</label><select id="fs-st">${types.map(t=>`<option ${t===s.serviceType?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label>Billing Currency</label><select id="fs-cur"><option value="USD" ${s.currency==='USD'?'selected':''}>USD</option><option value="TZS" ${s.currency==='TZS'?'selected':''}>TZS</option></select></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="saveEditSupplier('${id}')">Update Supplier</button>
  </div>`);
}
function saveNewSupplier() {
  const co=$('fs-co').value.trim(); if(!co){alert('Company name is required.');return;}
  DB.suppliers.push({id:nextId(DB.suppliers,'SP'),company:co,contact:$('fs-ct').value,phone:$('fs-ph').value,email:$('fs-em').value,address:$('fs-ad').value,tin:$('fs-tin').value,vat:$('fs-vat').value,serviceType:$('fs-st').value,currency:$('fs-cur').value});
  saveDB(); closeModal(); renderSuppliers();
}
function saveEditSupplier(id) {
  const co=$('fs-co').value.trim(); if(!co){alert('Company name is required.');return;}
  Object.assign(DB.suppliers.find(x=>x.id===id),{company:co,contact:$('fs-ct').value,phone:$('fs-ph').value,email:$('fs-em').value,address:$('fs-ad').value,tin:$('fs-tin').value,vat:$('fs-vat').value,serviceType:$('fs-st').value,currency:$('fs-cur').value});
  saveDB(); closeModal(); renderSuppliers();
}

// ── INVOICE FORM ──────────────────────────────────────────────────────────────
let _paxIdx=0, _sIdx=0;

function openInvoiceForm() { _buildInvoiceForm(null); }
function editInvoice(id)   { _buildInvoiceForm(DB.invoices.find(i=>i.id===id)); }

function _buildInvoiceForm(inv) {
  _paxIdx=0; _sIdx=0;
  const isEdit=!!inv;
  const clientOpts=DB.clients.map(c=>`<option value="${c.id}" ${inv&&inv.clientId===c.id?'selected':''}>${esc(c.company)}</option>`).join('');
  openModal(`<h2>${isEdit?'Edit Invoice '+inv.id:'New Client Invoice'}</h2>
  <div class="form-grid">
    <div class="field"><label>Client *</label><select id="fi-cl">${clientOpts}</select></div>
    <div class="field"><label>Supplier Invoice Ref</label>
      <input id="fi-ref" list="sinv-list" value="${isEdit?esc(inv.jobRef||''):''}" placeholder="Select or type supplier invoice…" autocomplete="off" onchange="autoFillInvTripRef(this.value)" onblur="autoFillInvTripRef(this.value)">
      <datalist id="sinv-list">${DB.supplierInvoices.map(si=>`<option value="${si.id}">${si.id}${si.tripRef?' ['+si.tripRef+']':''} — ${sp(si.supplierId).company} (${fmtA(si.amount,si.currency)})</option>`).join('')}</datalist>
    </div>
    <div class="field"><label>Trip / Job Reference</label>
      <input id="fi-trip" value="${isEdit?esc(inv.tripRef||''):''}" placeholder="Auto-filled from supplier invoice or type manually">
    </div>
    <div class="field"><label>Currency *</label><select id="fi-cur"><option value="USD" ${inv&&inv.currency==='USD'?'selected':''}>USD</option><option value="TZS" ${inv&&inv.currency==='TZS'?'selected':''}>TZS</option></select></div>
    <div class="field"><label>Invoice Date</label><input type="date" id="fi-dt" value="${isEdit?inv.date:today()}"></div>
    <div class="field"><label>Due Date</label><input type="date" id="fi-due" value="${isEdit?inv.due:''}"></div>
  </div>
  <div class="form-grid" style="margin-top:10px">
    <div class="field"><label>VAT Rate</label>
      <select id="fi-vat">
        <option value="0" ${inv&&(inv.vatRate||0)===0?'selected':''}>0% — No VAT</option>
        <option value="18" ${inv&&inv.vatRate===18?'selected':''}>18% — Standard VAT</option>
      </select>
    </div>
  </div>
  <div style="margin:14px 0 8px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Services</div>
  <div id="fi-secs"></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <button class="btn" onclick="addAirSection()">+ Air Tickets</button>
    <button class="btn" onclick="addHotelSection()">+ Hotel</button>
    <button class="btn" onclick="addGenSection('Transfers')">+ Transfers</button>
    <button class="btn" onclick="addGenSection('')">+ Other Service</button>
  </div>
  <div id="fi-totals" style="font-size:13px;text-align:right;padding:8px 0;border-top:0.5px solid var(--border)"></div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="${isEdit?'saveEditInvoice(\''+inv.id+'\')':'saveNewInvoice()'}">${isEdit?'Update Invoice':'Save Invoice'}</button>
  </div>`);
  if (isEdit) {
    inv.services.forEach(sv=>{
      if(sv.type==='Air Tickets') addAirSection(sv.passengers);
      else if(sv.type==='Hotel') addHotelSection(sv);
      else addGenSection(sv.type,sv);
    });
  }
}

function addAirSection(existPax) {
  const sid=_sIdx++;
  const d=document.createElement('div');
  d.id='sec'+sid; d.dataset.stype='Air Tickets';
  d.style.cssText='background:var(--bg2);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px;';
  d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:12px;font-weight:500">✈ Air Tickets</span>
    <button class="btn dan sml" onclick="this.closest('[id]').remove();calcInvTotals()">Remove</button>
  </div>
  <div id="paxlist${sid}"></div>
  <button class="btn sml" onclick="addPaxRow(${sid})" style="font-size:11px;margin-top:4px">+ Add Passenger</button>`;
  $('fi-secs').appendChild(d);
  if(existPax&&existPax.length) existPax.forEach(p=>addPaxRow(sid,p));
  else addPaxRow(sid);
}

function addPaxRow(sid,data) {
  const pid=_paxIdx++; const p=data||{};
  const d=document.createElement('div'); d.id='pr'+pid; d.className='pax-block';
  d.innerHTML=`<div class="pax-head">Passenger</div>
  <button class="btn dan sml del-pax" onclick="document.getElementById('pr${pid}').remove();calcInvTotals()">✕</button>
  <div class="pax-grid">
    <div class="field"><label>Full Name *</label><input class="px-name" value="${esc(p.name||'')}"></div>
    <div class="field"><label>PNR #</label><input class="px-pnr" value="${p.pnr||''}"></div>
    <div class="field"><label>From</label><input class="px-fr" value="${p.from||''}" placeholder="DAR"></div>
    <div class="field"><label>To</label><input class="px-to" value="${p.to||''}" placeholder="NBO"></div>
  </div>
  <div class="pax-fees">
    <div class="field"><label>Departure</label><input type="date" class="px-dep" value="${p.dep||''}"></div>
    <div class="field"><label>Return</label><input type="date" class="px-ret" value="${p.ret||''}"></div>
    <div class="field"><label>Flight Cost</label><input type="number" class="px-fc" value="${p.flightCost||''}" oninput="calcInvTotals()"></div>
    <div class="field"><label>Service Fee</label><input type="number" class="px-sf" value="${p.serviceFee||''}" oninput="calcInvTotals()"></div>
    <div class="field"><label>Total</label><input class="px-tot" readonly style="background:var(--bg)" value="${p.flightCost&&p.serviceFee?(+p.flightCost+ +p.serviceFee).toFixed(2):''}"></div>
  </div>`;
  $('paxlist'+sid).appendChild(d);
}

function addHotelSection(data) {
  const sid=_sIdx++; const sv=data||{};
  const d=document.createElement('div');
  d.id='sec'+sid; d.dataset.stype='Hotel';
  d.style.cssText='background:var(--bg2);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px;';
  d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:12px;font-weight:500">🏨 Hotel</span>
    <button class="btn dan sml" onclick="this.closest('[id]').remove();calcInvTotals()">Remove</button>
  </div>
  <div class="form-grid">
    <div class="field" style="grid-column:1/-1"><label>Description *</label><input class="gd" value="${esc(sv.desc||'')}" placeholder="e.g. Serena Zanzibar — Deluxe Room"></div>
    <div class="field"><label>Check-in Date</label><input type="date" class="h-cin" value="${sv.checkin||''}" oninput="calcNights(${sid})"></div>
    <div class="field"><label>Check-out Date</label><input type="date" class="h-cout" value="${sv.checkout||''}" oninput="calcNights(${sid})"></div>
    <div class="field"><label>Nights (Qty)</label><input type="number" class="gq" min="1" value="${sv.qty||1}" oninput="calcHotelTotal(${sid})"></div>
    <div class="field"><label>Rate per Night (Cost)</label><input type="number" class="gr" value="${sv.rate||''}" oninput="calcHotelTotal(${sid})"></div>
    <div class="field"><label>Total Cost</label><input type="number" class="gc" readonly style="background:var(--bg)" value="${sv.cost||''}"></div>
    <div class="field"><label>Sell Price (Total)</label><input type="number" class="gs" value="${sv.sell||''}" oninput="calcInvTotals()"></div>
    <div class="field"><label>Profit</label><input class="gp" readonly style="background:var(--bg)" value="${sv.cost&&sv.sell?sv.sell-sv.cost:''}"></div>
  </div>`;
  $('fi-secs').appendChild(d);
}

function calcNights(sid) {
  const s=$('sec'+sid); if(!s) return;
  const cin=s.querySelector('.h-cin').value, cout=s.querySelector('.h-cout').value;
  if(cin&&cout){const n=Math.round((new Date(cout)-new Date(cin))/(86400000));if(n>0)s.querySelector('.gq').value=n;}
  calcHotelTotal(sid);
}
function calcHotelTotal(sid) {
  const s=$('sec'+sid); if(!s) return;
  const q=parseFloat(s.querySelector('.gq').value)||0, r=parseFloat(s.querySelector('.gr').value)||0;
  s.querySelector('.gc').value=(q*r).toFixed(2);
  calcInvTotals();
}

function addGenSection(type, data) {
  const sid=_sIdx++; const sv=data||{};
  const resolvedType=type||sv.type||'';
  const d=document.createElement('div');
  d.id='sec'+sid; d.dataset.stype=resolvedType;
  d.style.cssText='background:var(--bg2);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px;';
  d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:12px;font-weight:500">📋 Service</span>
    <button class="btn dan sml" onclick="this.closest('[id]').remove();calcInvTotals()">Remove</button>
  </div>
  <div class="form-grid">
    <div class="field"><label>Service Type</label>${svcTypeSelect('gt', resolvedType)}</div>
    <div class="field" style="grid-column:1/-1"><label>Description *</label><input class="gd" value="${esc(sv.desc||'')}" placeholder="e.g. Airport Transfer (Return)"></div>
    <div class="field"><label>Qty</label><input type="number" class="gq" min="1" value="${sv.qty||1}" oninput="calcGenTotal(${sid})"></div>
    <div class="field"><label>Unit Cost</label><input type="number" class="gr" value="${sv.rate||sv.cost||''}" oninput="calcGenTotal(${sid})"></div>
    <div class="field"><label>Total Cost</label><input type="number" class="gc" readonly style="background:var(--bg)" value="${sv.cost||''}"></div>
    <div class="field"><label>Sell Price</label><input type="number" class="gs" value="${sv.sell||''}" oninput="calcInvTotals()"></div>
    <div class="field"><label>Profit</label><input class="gp" readonly style="background:var(--bg)" value="${sv.cost&&sv.sell?sv.sell-sv.cost:''}"></div>
  </div>`;
  $('fi-secs').appendChild(d);
  const sel=d.querySelector('.gt');
  if(sel) sel.addEventListener('change',function(){if(this.value!=='__other__')d.dataset.stype=this.value;});
}
function calcGenTotal(sid) {
  const s=$('sec'+sid); if(!s) return;
  const q=parseFloat(s.querySelector('.gq').value)||0, r=parseFloat(s.querySelector('.gr').value)||0;
  s.querySelector('.gc').value=(q*r).toFixed(2);
  calcInvTotals();
}

function calcInvTotals() {
  document.querySelectorAll('.pax-block').forEach(r=>{
    const fc=parseFloat(r.querySelector('.px-fc').value)||0, sf=parseFloat(r.querySelector('.px-sf').value)||0;
    r.querySelector('.px-tot').value=(fc+sf).toFixed(2);
  });
  document.querySelectorAll('#fi-secs > div').forEach(sec=>{
    const gcEl=sec.querySelector('.gc'), gsEl=sec.querySelector('.gs'), gpEl=sec.querySelector('.gp');
    if(gcEl&&gsEl&&gpEl) gpEl.value=(( parseFloat(gsEl.value)||0)-(parseFloat(gcEl.value)||0)).toFixed(2);
  });
  let totC=0,totS=0;
  document.querySelectorAll('#fi-secs > div').forEach(sec=>{
    if(sec.dataset.stype==='Air Tickets'){
      sec.querySelectorAll('.pax-block').forEach(r=>{
        totC+=parseFloat(r.querySelector('.px-fc').value)||0;
        totS+=(parseFloat(r.querySelector('.px-fc').value)||0)+(parseFloat(r.querySelector('.px-sf').value)||0);
      });
    } else {
      totC+=parseFloat(sec.querySelector('.gc')?sec.querySelector('.gc').value:0)||0;
      totS+=parseFloat(sec.querySelector('.gs')?sec.querySelector('.gs').value:0)||0;
    }
  });
  const cur=($('fi-cur')||{}).value||'USD';
  const profit=totS-totC, pct=totS?Math.round((profit/totS)*100):0;
  const t=$('fi-totals'); if(t) t.innerHTML=`<span class="c-muted">Cost: ${fmtA(totC,cur)}</span> &nbsp;|&nbsp; <span class="c-muted">Sell: ${fmtA(totS,cur)}</span> &nbsp;|&nbsp; <span class="profit-pill">Profit: ${fmtA(profit,cur)} (${pct}%)</span>`;
}

function _collectServices() {
  const secs=document.querySelectorAll('#fi-secs > div');
  const services=[]; let valid=true;
  secs.forEach(sec=>{
    const stype=sec.dataset.stype;
    if(stype==='Air Tickets'){
      const pax=[];
      sec.querySelectorAll('.pax-block').forEach(r=>{
        const name=r.querySelector('.px-name').value.trim();
        if(!name){valid=false;return;}
        pax.push({name,pnr:r.querySelector('.px-pnr').value,from:r.querySelector('.px-fr').value.toUpperCase(),to:r.querySelector('.px-to').value.toUpperCase(),dep:r.querySelector('.px-dep').value,ret:r.querySelector('.px-ret').value,flightCost:parseFloat(r.querySelector('.px-fc').value)||0,serviceFee:parseFloat(r.querySelector('.px-sf').value)||0});
      });
      if(pax.length) services.push({type:'Air Tickets',passengers:pax});
    } else if(stype==='Hotel'){
      const desc=sec.querySelector('.gd').value.trim();
      if(desc){const qty=parseFloat(sec.querySelector('.gq').value)||1,rate=parseFloat(sec.querySelector('.gr').value)||0,cost=parseFloat(sec.querySelector('.gc').value)||0,sell=parseFloat(sec.querySelector('.gs').value)||0,checkin=sec.querySelector('.h-cin').value,checkout=sec.querySelector('.h-cout').value;services.push({type:'Hotel',desc,qty,rate,cost,sell,checkin,checkout});}
    } else {
      const desc=sec.querySelector('.gd').value.trim();
      const gtEl=sec.querySelector('.gt');
      const type=gtEl?gtEl.value:stype;
      if(desc){const qty=parseFloat(sec.querySelector('.gq').value)||1,rate=parseFloat(sec.querySelector('.gr').value)||0,cost=parseFloat(sec.querySelector('.gc').value)||0,sell=parseFloat(sec.querySelector('.gs').value)||0;services.push({type,desc,qty,rate,cost,sell});}
    }
  });
  return {services,valid};
}

function saveNewInvoice() {
  const {services,valid}=_collectServices();
  if(!valid){alert('Fill in all passenger names.');return;}
  if(!services.length){alert('Add at least one service.');return;}
  const id=nextId(DB.invoices,'INV-');
  const vatRate=parseInt(($('fi-vat')||{}).value)||0;
  const invTripRef=($('fi-trip')||{}).value?.trim()||'';
  DB.invoices.push({id,jobRef:$('fi-ref').value.trim(),tripRef:invTripRef,clientId:$('fi-cl').value,date:$('fi-dt').value,due:$('fi-due').value,currency:$('fi-cur').value,vatRate,services,status:'Unpaid',paid:0,payments:[]});
  saveDB(); closeModal(); renderInvoices();
}
function saveEditInvoice(invId) {
  const {services,valid}=_collectServices();
  if(!valid){alert('Fill in all passenger names.');return;}
  if(!services.length){alert('Add at least one service.');return;}
  const inv=DB.invoices.find(i=>i.id===invId);
  inv.jobRef=$('fi-ref').value.trim(); inv.tripRef=($('fi-trip')||{}).value?.trim()||''; inv.clientId=$('fi-cl').value;
  inv.currency=$('fi-cur').value; inv.date=$('fi-dt').value; inv.due=$('fi-due').value;
  inv.vatRate=parseInt(($('fi-vat')||{}).value)||0; inv.services=services;
  const tot=invTotal(inv);
  inv.status=inv.paid>=tot?'Paid':inv.paid>0?'Partial':'Unpaid';
  saveDB(); closeModal(); renderInvoices();
}

// ── PURCHASE ORDER ────────────────────────────────────────────────────────────
let _prowIdx=0;
function openPOForm() { _buildPOForm(null); }
function editPO(id)    { _buildPOForm(DB.purchaseOrders.find(p=>p.id===id)); }

function _buildPOForm(po) {
  _prowIdx=0; const isEdit=!!po;
  const supOpts=DB.suppliers.map(s=>`<option value="${s.id}" ${po&&po.supplierId===s.id?'selected':''}>${esc(s.company)} (${s.currency})</option>`).join('');
  const invOpts='<option value="">— None —</option>'+DB.invoices.map(i=>`<option value="${i.id}" ${po&&po.invoiceRef===i.id?'selected':''}>${i.id}${i.jobRef?' ('+i.jobRef+')':''} — ${cl(i.clientId).company}</option>`).join('');
  openModal(`<h2>${isEdit?'Edit PO '+po.id:'New Purchase Order'}</h2>
  <div class="form-grid">
    <div class="field"><label>Supplier *</label><select id="fp-sup">${supOpts}</select></div>
    <div class="field"><label>Currency *</label><select id="fp-cur"><option value="USD" ${po&&po.currency==='USD'?'selected':''}>USD</option><option value="TZS" ${po&&po.currency==='TZS'?'selected':''}>TZS</option></select></div>
    <div class="field"><label>PO Date</label><input type="date" id="fp-dt" value="${isEdit?po.date:today()}"></div>
    <div class="field"><label>Linked Client Invoice</label><select id="fp-inv">${invOpts}</select></div>
    <div class="field" style="grid-column:1/-1">
      <label>Trip / Job Reference *</label>
      <input id="fp-ref" value="${isEdit?esc(po.tripRef||''):''}" placeholder="e.g. TRIP-2026-001 — unique ref across all documents">
      <div style="font-size:10px;color:var(--text3);margin-top:3px">This reference will carry through to the Supplier Invoice and appear in the Client Invoice dropdown.</div>
    </div>
  </div>
  <div class="form-grid" style="margin-top:10px">
    <div class="field"><label>VAT Rate</label>
      <select id="fp-vat">
        <option value="0" ${po&&(po.vatRate||0)===0?'selected':''}>0% — No VAT</option>
        <option value="18" ${po&&po.vatRate===18?'selected':''}>18% — Standard VAT</option>
      </select>
    </div>
  </div>
  <div style="margin:12px 0 8px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Items</div>
  <div id="fp-rows"></div>
  <button class="btn" onclick="addPORow()" style="font-size:12px;margin-bottom:12px">+ Add item</button>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="${isEdit?'saveEditPO(\''+po.id+'\')':'saveNewPO()'}">${isEdit?'Update PO':'Save PO'}</button>
  </div>`);
  if(po) po.items.forEach(it=>addPORow(it));
  else addPORow();
}
function addPORow(data) {
  const id=_prowIdx++; const it=data||{};
  const d=document.createElement('div'); d.className='srow'; d.id='pr'+id;
  d.innerHTML=`
    <div class="field" style="grid-column:span 2"><label>Description</label><input class="pd" value="${esc(it.desc||'')}" placeholder="e.g. Return tickets x2 DAR-NBO"></div>
    <div class="field"><label>Type</label>${svcTypeSelect('pt',it.type||'Air Tickets')}</div>
    <div class="field"><label>Qty</label><input type="number" class="pq" value="${it.qty||1}" min="1" oninput="calcPORow(${id})"></div>
    <div class="field"><label>Unit Cost (Reimbursable)</label><input type="number" class="pu" value="${it.unit||''}" placeholder="0" oninput="calcPORow(${id})"></div>
    <div class="field"><label>Service Fee (Your Revenue)</label><input type="number" class="psf" value="${it.serviceFee||''}" placeholder="0"></div>
    <div class="field"><label>Total Cost</label><input class="pp" readonly style="background:var(--bg2)" value="${it.total||''}"></div>
    <div style="padding-top:16px"><button class="btn dan sml" onclick="document.getElementById('pr${id}').remove()" style="padding:5px 9px">✕</button></div>`;
  $('fp-rows').appendChild(d);
}
function calcPORow(id) {
  const r=$('pr'+id);
  const qty=parseFloat(r.querySelector('.pq').value)||0;
  const unit=parseFloat(r.querySelector('.pu').value)||0;
  r.querySelector('.pp').value=(qty*unit).toFixed(2);
}
function _collectPOItems() {
  const items=[];
  document.querySelectorAll('#fp-rows .srow').forEach(r=>{
    const desc=r.querySelector('.pd').value.trim();
    if(desc){const q=parseFloat(r.querySelector('.pq').value)||1,u=parseFloat(r.querySelector('.pu').value)||0;const sfEl=r.querySelector('.psf');const sf=sfEl?parseFloat(sfEl.value)||0:0;items.push({desc,type:r.querySelector('.pt').value,qty:q,unit:u,total:q*u,serviceFee:sf});}
  });
  return items;
}
function saveNewPO() {
  const items=_collectPOItems(); if(!items.length){alert('Add at least one item.');return;}
  const id=nextId(DB.purchaseOrders,'PO-');
  const poVat=parseInt(($('fp-vat')||{}).value)||0;
  const tripRef=($('fp-ref')||{}).value?.trim()||'';
  if(!tripRef){alert('Trip / Job Reference is required.');return;}
  DB.purchaseOrders.push({id,supplierId:$('fp-sup').value,date:$('fp-dt').value,currency:$('fp-cur').value,invoiceRef:$('fp-inv').value,vatRate:poVat,tripRef,items,status:'Pending'});
  saveDB(); closeModal(); renderPOs();
}
function saveEditPO(poId) {
  const items=_collectPOItems(); if(!items.length){alert('Add at least one item.');return;}
  const po=DB.purchaseOrders.find(p=>p.id===poId);
  const tripRefE=($('fp-ref')||{}).value?.trim()||'';
  if(!tripRefE){alert('Trip / Job Reference is required.');return;}
  po.supplierId=$('fp-sup').value; po.date=$('fp-dt').value;
  po.currency=$('fp-cur').value; po.invoiceRef=$('fp-inv').value;
  po.vatRate=parseInt(($('fp-vat')||{}).value)||0; po.tripRef=tripRefE; po.items=items;
  saveDB(); closeModal(); renderPOs();
}

// ── SUPPLIER INVOICE ──────────────────────────────────────────────────────────
function openSInvForm() { _buildSInvForm(null); }
function editSInv(id)   { _buildSInvForm(DB.supplierInvoices.find(x=>x.id===id)); }

function _buildSInvForm(si) {
  const isEdit=!!si;
  const supOpts=DB.suppliers.map(s=>`<option value="${s.id}" ${si&&si.supplierId===s.id?'selected':''}>${esc(s.company)} (${s.currency})</option>`).join('');
  const poOpts='<option value="">— None —</option>'+DB.purchaseOrders.map(p=>`<option value="${p.id}" ${si&&si.poRef===p.id?'selected':''}>${p.id} — ${sp(p.supplierId).company}</option>`).join('');
  openModal(`<h2>${isEdit?'Edit Supplier Invoice '+si.id:'New Supplier Invoice'}</h2>
  <div class="form-grid">
    <div class="field"><label>Supplier *</label><select id="fsi-sup">${supOpts}</select></div>
    <div class="field"><label>Currency</label><select id="fsi-cur"><option value="USD" ${si&&si.currency==='USD'?'selected':''}>USD</option><option value="TZS" ${si&&si.currency==='TZS'?'selected':''}>TZS</option></select></div>
    <div class="field"><label>Invoice Date</label><input type="date" id="fsi-dt" value="${isEdit?si.date:today()}"></div>
    <div class="field"><label>Amount *</label><input type="number" id="fsi-amt" value="${isEdit?si.amount:''}"></div>
    <div class="field" style="grid-column:1/-1"><label>Linked PO</label><select id="fsi-po" onchange="autoFillSInvRef(this.value)">${poOpts}</select></div>
    <div class="field" style="grid-column:1/-1">
      <label>Trip / Job Reference</label>
      <input id="fsi-ref" value="${isEdit?esc(si.tripRef||''):''}" placeholder="Carried from Purchase Order — or enter manually">
    </div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="${isEdit?'saveEditSInv(\''+si.id+'\')':'saveNewSInv()'}">${isEdit?'Update':'Save'}</button>
  </div>`);
}
function saveNewSInv() {
  const amt=parseFloat($('fsi-amt').value)||0; if(!amt){alert('Amount is required.');return;}
  const id=nextId(DB.supplierInvoices,'SINV-');
  const siRef=($('fsi-ref')||{}).value?.trim()||'';
  DB.supplierInvoices.push({id,supplierId:$('fsi-sup').value,date:$('fsi-dt').value,currency:$('fsi-cur').value,amount:amt,poRef:$('fsi-po').value,tripRef:siRef,status:'Unpaid'});
  saveDB(); closeModal(); renderSInvoices();
}
function saveEditSInv(siId) {
  const amt=parseFloat($('fsi-amt').value)||0; if(!amt){alert('Amount is required.');return;}
  const si=DB.supplierInvoices.find(x=>x.id===siId);
  si.supplierId=$('fsi-sup').value; si.date=$('fsi-dt').value;
  si.currency=$('fsi-cur').value; si.amount=amt; si.poRef=$('fsi-po').value;
  si.tripRef=($('fsi-ref')||{}).value?.trim()||'';
  saveDB(); closeModal(); renderSInvoices();
}

// ── Auto-fill trip ref on client invoice when selecting supplier invoice ────
function autoFillInvTripRef(sinvId) {
  if (!sinvId) return;
  const si = DB.supplierInvoices.find(x => x.id === sinvId.trim());
  const tripEl = $('fi-trip');
  if (!si || !tripEl) return;
  // Try SI tripRef first, then fall back to the linked PO tripRef
  let ref = si.tripRef || '';
  if (!ref && si.poRef) {
    const po = DB.purchaseOrders.find(p => p.id === si.poRef);
    if (po && po.tripRef) ref = po.tripRef;
  }
  // Always fill if we found a ref (allow overwriting blank field)
  if (ref) tripEl.value = ref;
}

// ── Auto-fill trip ref from PO when selecting linked PO ────────────────────
function autoFillSInvRef(poId) {
  const po = DB.purchaseOrders.find(p=>p.id===poId);
  const refEl = $('fsi-ref');
  if (po && po.tripRef && refEl && !refEl.value) {
    refEl.value = po.tripRef;
  }
}

// ── EXPENSE ───────────────────────────────────────────────────────────────────
const EXP_CATS=['Rent','Salaries','Utilities','Software','Travel','Marketing','Office Supplies','Bank Charges','Other'];
function openExpenseForm() { _buildExpenseForm(null); }
function editExpense(id)   { _buildExpenseForm((DB.overheads||[]).find(x=>x.id===id)); }

function _buildExpenseForm(e) {
  const isEdit=!!e;
  openModal(`<h2>${isEdit?'Edit':'New'} Expense</h2>
  <div class="form-grid">
    <div class="field"><label>Date *</label><input type="date" id="ex-dt" value="${isEdit?e.date:today()}"></div>
    <div class="field"><label>Category *</label><select id="ex-cat">${EXP_CATS.map(c=>`<option ${isEdit&&e.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field" style="grid-column:1/-1"><label>Description *</label><input id="ex-desc" value="${isEdit?esc(e.description):''}" placeholder="e.g. Office Rent — March 2026"></div>
    <div class="field"><label>Currency</label><select id="ex-cur"><option value="TZS" ${isEdit&&e.currency==='TZS'?'selected':''}>TZS</option><option value="USD" ${isEdit&&e.currency==='USD'?'selected':''}>USD</option></select></div>
    <div class="field"><label>Amount *</label><input type="number" id="ex-amt" value="${isEdit?e.amount:''}"></div>
    <div class="field" style="grid-column:1/-1"><label>Receipt / Reference Number</label><input id="ex-ref" value="${isEdit?e.ref||'':''}" placeholder="e.g. REC-001"></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="${isEdit?'saveEditExpense(\''+e.id+'\')':'saveNewExpense()'}">${isEdit?'Update':'Save Expense'}</button>
  </div>`);
}
function saveNewExpense() {
  const desc=$('ex-desc').value.trim(), amt=parseFloat($('ex-amt').value)||0;
  if(!desc||!amt){alert('Description and amount are required.');return;}
  if(!DB.overheads) DB.overheads=[];
  DB.overheads.push({id:nextId(DB.overheads,'EXP-'),date:$('ex-dt').value,description:desc,category:$('ex-cat').value,currency:$('ex-cur').value,amount:amt,ref:$('ex-ref').value.trim()});
  saveDB(); closeModal(); renderOverheads();
}
function saveEditExpense(id) {
  const desc=$('ex-desc').value.trim(), amt=parseFloat($('ex-amt').value)||0;
  if(!desc||!amt){alert('Description and amount are required.');return;}
  Object.assign(DB.overheads.find(x=>x.id===id),{date:$('ex-dt').value,description:desc,category:$('ex-cat').value,currency:$('ex-cur').value,amount:amt,ref:$('ex-ref').value.trim()});
  saveDB(); closeModal(); renderOverheads();
}

// ── QUICK ACTIONS ─────────────────────────────────────────────────────────────
function recordPayment(id) {
  const inv=DB.invoices.find(i=>i.id===id);
  const bal=invTotal(inv)-inv.paid;
  if(bal<=0){alert('Invoice is already fully paid.');return;}
  openModal(`<h2>Record Payment — ${inv.id}</h2>
  <div style="background:var(--bg2);padding:10px 12px;border-radius:var(--radius);margin-bottom:14px;font-size:13px">
    <div style="display:flex;justify-content:space-between"><span class="c-muted">Invoice Total</span><span>${fmtA(invTotal(inv),inv.currency)}</span></div>
    <div style="display:flex;justify-content:space-between"><span class="c-muted">Already Paid</span><span>${fmtA(inv.paid,inv.currency)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:500;border-top:0.5px solid var(--border);margin-top:6px;padding-top:6px"><span>Balance Due</span><span class="c-red">${fmtA(bal,inv.currency)}</span></div>
  </div>
  <div class="form-grid">
    <div class="field"><label>Payment Date *</label><input type="date" id="pay-dt" value="${today()}"></div>
    <div class="field"><label>Amount Received (${inv.currency}) *</label><input type="number" id="pay-amt" placeholder="0"></div>
    <div class="field" style="grid-column:1/-1"><label>Note / Reference</label><input id="pay-note" placeholder="e.g. Bank transfer ref #12345"></div>
  </div>
  <div class="mfooter">
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="savePayment('${id}')">Save Payment</button>
  </div>`);
}
function savePayment(id) {
  const inv=DB.invoices.find(i=>i.id===id);
  const amt=parseFloat($('pay-amt').value)||0;
  if(amt<=0){alert('Enter a valid amount.');return;}
  const dt=$('pay-dt').value, note=$('pay-note').value;
  if(!inv.payments) inv.payments=[];
  inv.payments.push({date:dt,amount:amt,note});
  inv.paid=Math.min(invTotal(inv),inv.paid+amt);
  inv.status=inv.paid>=invTotal(inv)?'Paid':inv.paid>0?'Partial':'Unpaid';
  saveDB(); closeModal(); renderInvoices();
}

function markSIPaid(id) {
  const si=DB.supplierInvoices.find(x=>x.id===id);
  if(!si||si.status==='Paid') return;
  if(confirm('Mark '+si.id+' as Paid?\nAmount: '+fmtA(si.amount,si.currency))){si.status='Paid';saveDB();renderSInvoices();}
}

// ── DELETES ────────────────────────────────────────────────────────────────────
function deleteClient(id) {
  const c=DB.clients.find(x=>x.id===id); if(!c) return;
  if(DB.invoices.some(i=>i.clientId===id)){alert('Cannot delete "'+c.company+'" — delete their invoices first.');return;}
  if(confirm('Delete client "'+c.company+'"?\nThis cannot be undone.')){DB.clients=DB.clients.filter(x=>x.id!==id);saveDB();renderClients();}
}
function deleteSupplier(id) {
  const s=DB.suppliers.find(x=>x.id===id); if(!s) return;
  if(DB.purchaseOrders.some(p=>p.supplierId===id)||DB.supplierInvoices.some(si=>si.supplierId===id)){alert('Cannot delete "'+s.company+'" — delete their POs and invoices first.');return;}
  if(confirm('Delete supplier "'+s.company+'"?\nThis cannot be undone.')){DB.suppliers=DB.suppliers.filter(x=>x.id!==id);saveDB();renderSuppliers();}
}
function deleteInvoice(id) {
  const inv=DB.invoices.find(i=>i.id===id); if(!inv) return;
  if(confirm('Delete invoice '+inv.id+'?\nThis cannot be undone.')){DB.invoices=DB.invoices.filter(i=>i.id!==id);saveDB();renderInvoices();}
}
function deletePO(id) {
  const po=DB.purchaseOrders.find(p=>p.id===id); if(!po) return;
  if(DB.supplierInvoices.some(si=>si.poRef===id)){alert('Cannot delete '+po.id+' — a supplier invoice is linked. Delete that first.');return;}
  if(confirm('Delete purchase order '+po.id+'?\nThis cannot be undone.')){DB.purchaseOrders=DB.purchaseOrders.filter(p=>p.id!==id);saveDB();renderPOs();}
}
function deleteSInv(id) {
  const si=DB.supplierInvoices.find(x=>x.id===id); if(!si) return;
  if(confirm('Delete supplier invoice '+si.id+'?\nAmount: '+fmtA(si.amount,si.currency)+'\nThis cannot be undone.')){DB.supplierInvoices=DB.supplierInvoices.filter(x=>x.id!==id);saveDB();renderSInvoices();}
}
function deleteExpense(id) {
  const e=(DB.overheads||[]).find(x=>x.id===id); if(!e) return;
  if(confirm('Delete expense "'+e.description+'"?\nThis cannot be undone.')){DB.overheads=DB.overheads.filter(x=>x.id!==id);saveDB();renderOverheads();}
}
