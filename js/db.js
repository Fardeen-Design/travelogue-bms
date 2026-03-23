// js/db.js  —  data layer

const FX = { rate: 2530 };

const DEFAULT_DB = {
  settings: {
    companyName:'Travelogue Tours Ltd',
    address:'Plot 45, Samora Avenue, Dar es Salaam, Tanzania',
    tin:'100-234-567', vat:'40-123456-Z',
    phone:'+255 22 211 0000', email:'info@traveloguetours.co.tz'
  },
  clients:[
    {id:'CL001',company:'Karibu Safaris Ltd',contact:'James Mwangi',email:'james@karibusafaris.com',phone:'+255 712 000 001',address:'Msasani, Dar es Salaam',tin:'100-111-001',vat:'40-000001-A'},
    {id:'CL002',company:'Zanzibar Dream Travel',contact:'Fatma Hassan',email:'fatma@zanzibardream.com',phone:'+255 777 000 002',address:'Stone Town, Zanzibar',tin:'100-111-002',vat:'40-000002-B'},
    {id:'CL003',company:'East Africa Explorers',contact:'David Kimani',email:'david@eaexplorers.com',phone:'+255 654 000 003',address:'Arusha CBD, Arusha',tin:'100-111-003',vat:''},
  ],
  suppliers:[
    {id:'SP001',company:'Kenya Airways',contact:'Sales Desk',email:'sales@kenya-airways.com',phone:'+254 20 327 4747',address:'Nairobi, Kenya',tin:'P000111111A',vat:'',currency:'USD',serviceType:'Air Tickets'},
    {id:'SP002',company:'Serena Hotels Group',contact:'Reservations',email:'res@serenahotels.com',phone:'+255 22 211 2416',address:'Ohio Street, Dar es Salaam',tin:'100-222-001',vat:'40-222001-S',currency:'USD',serviceType:'Hotel'},
    {id:'SP003',company:'Safari Transfers Co.',contact:'Ops Team',email:'ops@safaritransfers.tz',phone:'+255 713 000 099',address:'Ubungo, Dar es Salaam',tin:'100-333-001',vat:'',currency:'TZS',serviceType:'Transfers'},
  ],
  invoices:[
    {
      id:'INV-001', jobRef:'SINV-001', tripRef:'TRIP-2025-001', clientId:'CL001',
      date:'2025-02-10', due:'2025-02-24', currency:'USD', status:'Partial',
      paid:500, payments:[{date:'2025-02-20',amount:500,note:'Part payment'}],
      services:[
        {type:'Air Tickets',passengers:[
          {name:'James Mwangi',pnr:'ABC123',from:'DAR',to:'NBO',dep:'2025-02-15',ret:'2025-02-22',flightCost:420,serviceFee:55},
          {name:'Sarah Mwangi',pnr:'ABC124',from:'DAR',to:'NBO',dep:'2025-02-15',ret:'2025-02-22',flightCost:420,serviceFee:55},
        ]},
        {type:'Transfers',desc:'Airport Transfer x4 (Return)',qty:1,rate:80,cost:80,sell:130},
      ]
    },
    {
      id:'INV-002', jobRef:'SINV-002', tripRef:'TRIP-2025-002', clientId:'CL002',
      date:'2025-02-18', due:'2025-03-04', currency:'USD', status:'Unpaid',
      paid:0, payments:[],
      services:[
        {type:'Hotel',desc:'Serena Zanzibar 3 nights DBL',qty:3,rate:260,cost:780,sell:980,checkin:'2025-02-20',checkout:'2025-02-23'},
      ]
    },
    {
      id:'INV-003', jobRef:'SINV-004', tripRef:'TRIP-2025-003', clientId:'CL003',
      date:'2025-01-15', due:'2025-01-29', currency:'TZS', status:'Paid',
      paid:7200000, payments:[{date:'2025-01-28',amount:7200000,note:'Full payment'}],
      services:[
        {type:'Air Tickets',passengers:[
          {name:'David Kimani',pnr:'KQ001',from:'DAR',to:'JRO',dep:'2025-01-20',ret:'2025-01-25',flightCost:560000,serviceFee:40000},
          {name:'Alice Wanjiru',pnr:'KQ002',from:'DAR',to:'JRO',dep:'2025-01-20',ret:'2025-01-25',flightCost:560000,serviceFee:40000},
        ]},
        {type:'Hotel',desc:'Kibo Palace 2 nights x6 pax',qty:12,rate:150000,cost:1800000,sell:2400000,checkin:'2025-01-20',checkout:'2025-01-22'},
        {type:'Transfers',desc:'Airport Transfers x6 Return',qty:1,rate:420000,cost:420000,sell:600000},
      ]
    },
  ],
  purchaseOrders:[
    {id:'PO-001',supplierId:'SP001',invoiceRef:'INV-001',date:'2025-02-08',currency:'USD',tripRef:'TRIP-2025-001',items:[{desc:'Return tickets x2 DAR-NBO (Mwangi)',type:'Air Tickets',qty:2,unit:420,total:840}],status:'Billed'},
    {id:'PO-002',supplierId:'SP002',invoiceRef:'INV-002',date:'2025-02-17',currency:'USD',tripRef:'TRIP-2025-002',items:[{desc:'Zanzibar Serena 3nts DBL',type:'Hotel',qty:1,unit:780,total:780}],status:'Billed'},
    {id:'PO-003',supplierId:'SP003',invoiceRef:'INV-001',date:'2025-02-08',currency:'TZS',tripRef:'TRIP-2025-001',items:[{desc:'Airport transfers x4 return',type:'Transfers',qty:4,unit:50000,total:200000}],status:'Paid'},
    {id:'PO-004',supplierId:'SP001',invoiceRef:'INV-003',date:'2025-01-13',currency:'TZS',tripRef:'TRIP-2025-003',items:[{desc:'Return tickets x2 DAR-JRO',type:'Air Tickets',qty:2,unit:560000,total:1120000}],status:'Paid'},
  ],
  supplierInvoices:[
    {id:'SINV-001',supplierId:'SP001',poRef:'PO-001',date:'2025-02-09',currency:'USD',amount:840,tripRef:'TRIP-2025-001',status:'Unpaid'},
    {id:'SINV-002',supplierId:'SP002',poRef:'PO-002',date:'2025-02-18',currency:'USD',amount:780,tripRef:'TRIP-2025-002',status:'Unpaid'},
    {id:'SINV-003',supplierId:'SP003',poRef:'PO-003',date:'2025-02-09',currency:'TZS',amount:200000,tripRef:'TRIP-2025-001',status:'Paid'},
    {id:'SINV-004',supplierId:'SP001',poRef:'PO-004',date:'2025-01-14',currency:'TZS',amount:1120000,tripRef:'TRIP-2025-003',status:'Paid'},
  ],
  overheads:[
    {id:'EXP-001',date:'2025-01-31',description:'Office Rent January',category:'Rent',currency:'TZS',amount:1500000,ref:'REC-001'},
    {id:'EXP-002',date:'2025-01-31',description:'Staff Salaries January',category:'Salaries',currency:'TZS',amount:3200000,ref:''},
    {id:'EXP-003',date:'2025-02-05',description:'Internet and Phone',category:'Utilities',currency:'TZS',amount:180000,ref:'REC-002'},
    {id:'EXP-004',date:'2025-02-10',description:'GDS System Fee',category:'Software',currency:'USD',amount:120,ref:'INV-GDS-02'},
  ],
  serviceTypes:['Air Tickets','Hotel','Transfers','Meals','Visa Fees','Travel Insurance','Extras'],
};

let DB;
function loadDB() {
  try {
    const saved = localStorage.getItem('travelogue_db');
    DB = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_DB));
    if (!DB.overheads)      DB.overheads = [];
    // migrate: ensure tripRef on POs, supplier invoices, and client invoices
    (DB.purchaseOrders||[]).forEach(p=>{if(!p.tripRef)p.tripRef=''});
    (DB.supplierInvoices||[]).forEach(si=>{if(!si.tripRef)si.tripRef=''});
    (DB.invoices||[]).forEach(i=>{if(!i.tripRef)i.tripRef='';});
    if (!DB.serviceTypes)   DB.serviceTypes = DEFAULT_DB.serviceTypes.slice();
    // migrate: ensure payments array on invoices
    (DB.invoices||[]).forEach(i => { if (!i.payments) i.payments = []; });
  } catch(e) {
    DB = JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  const fx = localStorage.getItem('travelogue_fx');
  if (fx) FX.rate = parseFloat(fx) || 2530;
}

function saveDB() {
  try {
    localStorage.setItem('travelogue_db', JSON.stringify(DB));
    localStorage.setItem('travelogue_fx', String(FX.rate));
  } catch(e) { console.error('Save failed', e); }
}
