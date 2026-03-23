// js/app.js  —  navigation & bootstrap

function nav(page) {
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>{
    if(el.getAttribute('onclick')&&el.getAttribute('onclick').includes("'"+page+"'"))
      el.classList.add('active');
  });
  const titles={dashboard:'Dashboard',clients:'Client Master Data',suppliers:'Supplier Master Data',invoices:'Client Invoices',pos:'Purchase Orders',sinvoices:'Supplier Invoices',overheads:'Overheads & Expenses',profit:'Profit Tracker',soa:'Statements of Account',reports:'Reports',settings:'Settings'};
  document.getElementById('ptitle').textContent=titles[page]||page;
  const acts={
    clients:`<button class="btn pri" onclick="openClientForm()">+ New Client</button>`,
    suppliers:`<button class="btn pri" onclick="openSupplierForm()">+ New Supplier</button>`,
    invoices:`<button class="btn pri" onclick="openInvoiceForm()">+ New Invoice</button>`,
    pos:`<button class="btn pri" onclick="openPOForm()">+ New Purchase Order</button>`,
    sinvoices:`<button class="btn pri" onclick="openSInvForm()">+ New Supplier Invoice</button>`,
    overheads:`<button class="btn pri" onclick="openExpenseForm()">+ New Expense</button>`,
  };
  document.getElementById('tacts').innerHTML=acts[page]||'';
  const renders={dashboard:renderDashboard,clients:renderClients,suppliers:renderSuppliers,invoices:renderInvoices,pos:renderPOs,sinvoices:renderSInvoices,overheads:renderOverheads,profit:renderProfit,soa:renderSOA,reports:renderReports,settings:renderSettings};
  if(renders[page]) renders[page]();
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) closeSidebar();
}

document.getElementById('overlay').addEventListener('click',e=>{
  if(e.target===document.getElementById('overlay')) closeModal();
});

loadDB();
nav('dashboard');

// ── Mobile sidebar ─────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('mob-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mob-overlay').classList.remove('open');
}
function checkMobile() {
  const btn = document.getElementById('menu-btn');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
}
window.addEventListener('resize', checkMobile);
window.addEventListener('DOMContentLoaded', checkMobile);
checkMobile();
