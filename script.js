    // wrap everything to run after DOM ready to avoid race conditions
document.addEventListener('DOMContentLoaded', function () {

  // --- Element references (safe - check existence before using) ---
  const btnBooking = document.getElementById('btnBooking');
  const btnadmin = document.getElementById('btnadmin');
  const sectionBooking = document.getElementById('sectionBooking');
  const sectionadmin = document.getElementById('sectionadmin');

  const adminRecords = [];

  ///// NEW: track active vehicles so same vehicle can't book twice
  const activeVehicles = []; // store normalized vehicle numbers (uppercase, trimmed)

  function renderNotifications() {
    try {
      const out = adminRecords.slice(-10).reverse().map(r =>
        `<div style="background:var(--card);border:1px solid var(--line);border-radius:6px;padding:10px 12px;margin-bottom:8px;">
          <strong>${r.action}</strong> • Vehicle: ${r.vehicle} • Name: ${r.name} • Area: ${(r.area||'').toUpperCase()} • <span style="color:var(--muted);font-size:12px">${r.date} ${r.time}</span>
        </div>`
      ).join('');
      const el = document.getElementById('adminNotifications');
      if (el) el.innerHTML = out || "<span style=\"color:var(--muted)\">No records yet.</span>";
    } catch (e) {
      console.error('renderNotifications error', e);
    }
  }

  // helper to format date as DD-MM-YYYY
  function formatDateDDMMYYYY(d){
    try{
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch(e){
      return '';
    }
  }
  // helper to format time (localized)
  function formatTimeLocalized(d){
    try{
      return d.toLocaleTimeString(); // uses user's locale time format (e.g. 12:07:23 PM)
    } catch(e){
      return '';
    }
  }

  // spots count
  const areaState = {
    campus: new Array(10).fill(false),
    gate1: new Array(10).fill(false),
    gate2: new Array(10).fill(false)
  };

  function renderLiveSpots(){
    try {
      ['campus','gate1','gate2'].forEach(area=>{
        const container = document.getElementById('boxes-'+area);
        if(!container) return;
        container.innerHTML = '';
        areaState[area].forEach((occ, idx)=>{
          const b = document.createElement('div');
          b.className = 'box' + (occ ? ' occupied' : '');
          b.dataset.area = area;
          b.dataset.index = idx;
          b.title = occ ? 'Occupied' : 'Free';
          b.textContent = '';
          container.appendChild(b);
        });
        const occupied = areaState[area].filter(x=>x).length;
        const counterEl = document.getElementById('count-'+area);
        if(counterEl) counterEl.textContent = occupied + '/10';

        // UPDATE the simplified Available Spots readout (remaining slots)
        const availableEl = document.getElementById('available-'+area);
        if(availableEl){
          const remaining = 10 - occupied;
          availableEl.textContent = `${remaining}/10`;
        }
      });
    } catch(e){
      console.error('renderLiveSpots error', e);
    }
  }

  // Ticket state
  const ticketState = {
    hasTicket: false,
    scanned: false,
    status: "Not Entered",
    ticketId: null,
    name: null,
    vehicle: null,
    type: null,
    area: null,
    expiry: null,
    qrText: null,
    spotIndex: null
  };

  // DOM elements used by forms and actions
  const bookingNameEl = document.getElementById('bookingName');
  const bookingVehicleEl = document.getElementById('bookingVehicle');
  const btnReserve = document.getElementById('btnReserve');
  const errName = document.getElementById('errName');
  const errVehicle = document.getElementById('errVehicle');
  const bookingTypeEl = document.getElementById('bookingType');
  const bookingAreaEl = document.getElementById('bookingArea');

  // admin-only buttons and download
  const btnMarkEntry = document.getElementById('btnMarkEntry');
  const btnMarkExit = document.getElementById('btnMarkExit');
  const btnDownloadTicket = document.getElementById('btnDownloadTicket');

  // helper to show/hide admin controls
  function showAdminControls(show){
    try {
      if(btnMarkEntry) btnMarkEntry.style.display = show ? 'inline-block' : 'none';
      if(btnMarkExit) btnMarkExit.style.display = show ? 'inline-block' : 'none';
      if(btnMarkEntry) btnMarkEntry.disabled = !show;
      if(btnMarkExit) btnMarkExit.disabled = !show;
    } catch(e){
      console.error('showAdminControls error', e);
    }
  }

  // hide admin controls by default (users shouldn't see them)
  showAdminControls(false);

  function validateFormInputs() {
    try {
      if(!btnReserve) return;
      const name = bookingNameEl ? bookingNameEl.value.trim() : '';
      const vehicle = bookingVehicleEl ? bookingVehicleEl.value.trim() : '';
      btnReserve.disabled = !(name && vehicle);
      if (name && errName) errName.style.display = 'none';
      if (vehicle && errVehicle) errVehicle.style.display = 'none';
    } catch(e){
      console.error('validateFormInputs error', e);
    }
  }

  if (bookingNameEl) bookingNameEl.addEventListener('input', validateFormInputs);
  if (bookingVehicleEl) bookingVehicleEl.addEventListener('input', validateFormInputs);
  validateFormInputs();

  if(btnBooking){
    btnBooking.addEventListener('click', ()=>{
      try {
        btnBooking.classList.add('active');
        if(btnadmin) btnadmin.classList.remove('active');
        if(sectionBooking) sectionBooking.style.display='block';
        if(sectionadmin) sectionadmin.style.display='none';
        const adminCard = document.getElementById('adminNotificationsCard');
        if(adminCard) adminCard.style.display='none';

        // when in booking/user view, admin-only buttons must be hidden
        showAdminControls(false);

        if(ticketState.hasTicket){
          const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
          set('ticketName', ticketState.name || '—');
          set('ticketVehicle', ticketState.vehicle || '—');
          set('ticketId', ticketState.ticketId || '—');
          set('ticketSpot', (ticketState.area || '—').toUpperCase());
          set('ticketType', ticketState.type || '—');
          set('ticketExpiry', ticketState.expiry || '—');
          set('ticketStatus', ticketState.status || 'Not Entered');
          const qrBox = document.getElementById('ticketQR');
          if(qrBox){ qrBox.innerHTML = ''; if(ticketState.qrText && typeof QRCode === 'function'){ new QRCode(qrBox, { text: ticketState.qrText, width:128, height:128 }); } }
          const ticketContent = document.getElementById('ticketContent');
          const noTicket = document.getElementById('noTicket');
          if(ticketContent) ticketContent.style.display='block';
          if(noTicket) noTicket.style.display='none';
        } else {
          const ticketContent = document.getElementById('ticketContent');
          const noTicket = document.getElementById('noTicket');
          if(ticketContent) ticketContent.style.display='none';
          if(noTicket) noTicket.style.display='block';
        }
      } catch(e){ console.error('btnBooking click error', e); }
    });
  }

  if(btnadmin){
    btnadmin.addEventListener('click', ()=>{
      try {
        btnadmin.classList.add('active');
        if(btnBooking) btnBooking.classList.remove('active');
        if(sectionadmin) sectionadmin.style.display='block';
        if(sectionBooking) sectionBooking.style.display='none';
        const adminCard = document.getElementById('adminNotificationsCard');
        if(adminCard) adminCard.style.display='block';
        renderNotifications();

        // admin view: only show admin controls if ticket is scanned/verified
        showAdminControls(!!ticketState.scanned);

        if(!ticketState.scanned){
          const ticketContent = document.getElementById('ticketContent');
          const noTicket = document.getElementById('noTicket');
          if(ticketContent) ticketContent.style.display='none';
          if(noTicket) noTicket.style.display='block';
        } else {
          const ticketContent = document.getElementById('ticketContent');
          const noTicket = document.getElementById('noTicket');
          if(ticketContent) ticketContent.style.display='block';
          if(noTicket) noTicket.style.display='none';
        }

        const scanResult = document.getElementById('scanResult');
        if(scanResult) scanResult.style.display='none';
        const adminInput = document.getElementById('adminInput');
        if(adminInput) adminInput.value = '';
      } catch(e){ console.error('btnadmin click error', e); }
    });
  }

  function assignBox(area){
    try {
      if(!areaState[area]) return -1;
      const idx = areaState[area].indexOf(false);
      if(idx === -1) return -1;
      areaState[area][idx] = true;
      renderLiveSpots();
      return idx;
    } catch(e){ console.error('assignBox error', e); return -1; }
  }
  function freeBox(area, idx){
    try {
      if(!areaState[area]) return;
      if(idx == null) {
        const last = areaState[area].lastIndexOf(true);
        if(last !== -1){ areaState[area][last] = false; }
      } else {
        areaState[area][idx] = false;
      }
      renderLiveSpots();
    } catch(e){ console.error('freeBox error', e); }
  }

  //  add admin record 
  function addAdminRecord(action, t) {
    try {
      // use real world current time broken into separate date/time columns
      const now = new Date();
      const dateStr = formatDateDDMMYYYY(now); // DD-MM-YYYY
      const timeStr = formatTimeLocalized(now); // localized time string

      adminRecords.push({
        action,
        id: t.ticketId,
        name: t.name,
        vehicle: t.vehicle,
        type: t.type,
        area: t.area,
        date: dateStr,
        time: timeStr
      });
      renderNotifications();
    } catch(e){ console.error('addAdminRecord error', e); }
  }

  if(btnReserve){
    btnReserve.addEventListener('click', ()=>{
      try {
        const name = bookingNameEl ? bookingNameEl.value.trim() : '';
        const vehicle = bookingVehicleEl ? bookingVehicleEl.value.trim() : '';
        const type = bookingTypeEl ? bookingTypeEl.value : '';
        const area = bookingAreaEl ? bookingAreaEl.value : '';
        let ok = true;
        if(!name){ if(errName) errName.style.display='block'; ok=false; } else if(errName) errName.style.display='none';
        if(!vehicle){ if(errVehicle) errVehicle.style.display='block'; ok=false; } else if(errVehicle) errVehicle.style.display='none';
        if(!type || !area){ alert('Please select type and area.'); return; }
        if(!ok){ alert('Please fill in the required fields before reserving a slot.'); return; }

        ///// NEW: prevent duplicate vehicle booking (normalize for case-insensitivity)
        const normalizedVehicle = vehicle.toUpperCase().replace(/\s+/g,'');
        if(activeVehicles.includes(normalizedVehicle)){
          alert('This vehicle is already parked / has an active booking. A vehicle cannot have two slots.');
          return;
        }

        const assigned = assignBox(area);
        if(assigned === -1){ alert('No free spot available in the selected area.'); return; }
        const ticketId = 'TKT' + Math.floor(Math.random()*10000);
        const expiryTime = new Date(Date.now()+3600000);
        const expiry = expiryTime.toLocaleTimeString();

        ticketState.hasTicket = true;
        ticketState.scanned = false;
        ticketState.status = "Not Entered";
        ticketState.ticketId = ticketId;
        ticketState.name = name;
        ticketState.vehicle = vehicle;
        ticketState.type = type;
        ticketState.area = area;
        ticketState.expiry = expiry;
        ticketState.spotIndex = assigned;
        ticketState.qrText = `SmartParking\nID:${ticketId}\nName:${name}\nVehicle:${vehicle}\nArea:${area}`;

        // add vehicle to activeVehicles
        activeVehicles.push(normalizedVehicle);

        // update ticket UI safely
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        set('ticketName', ticketState.name);
        set('ticketVehicle', ticketState.vehicle);
        set('ticketId', ticketState.ticketId);
        set('ticketSpot', (ticketState.area || '—').toUpperCase());
        set('ticketType', ticketState.type);
        set('ticketExpiry', ticketState.expiry);
        set('ticketStatus', ticketState.status);

        const qrBox = document.getElementById('ticketQR');
        if(qrBox){ qrBox.innerHTML = ''; if(typeof QRCode === 'function') new QRCode(qrBox, { text: ticketState.qrText, width:128, height:128 }); }

        const ticketContent = document.getElementById('ticketContent');
        const noTicket = document.getElementById('noTicket');
        if(ticketContent) ticketContent.style.display='block';
        if(noTicket) noTicket.style.display='none';

        const scanResult = document.getElementById('scanResult');
        if(scanResult) scanResult.style.display='none';
        const adminInput = document.getElementById('adminInput');
        if(adminInput) adminInput.value = '';

        addAdminRecord('Parked', ticketState);

        alert(`Slot reserved. Ticket ID: ${ticketId} — Assigned box #${assigned+1} in ${area.toUpperCase()}`);
      } catch(e){
        console.error('btnReserve click error', e);
        alert('An error occurred while reserving. Check console.');
      }
    });
  }

  if(btnMarkEntry){
    btnMarkEntry.addEventListener('click', ()=>{
      try {
        if(!ticketState.hasTicket){ alert("No active ticket."); return; }
        const inGateView = (sectionadmin && sectionadmin.style.display === 'block');
        if(inGateView && !ticketState.scanned){ alert("Ticket not scanned at gate. Please scan ticket at gate before marking entry here."); return; }
        ticketState.status = "Entered";
        const ts = document.getElementById('ticketStatus');
        if(ts) ts.textContent = "✅ Entered";
        if(document.getElementById('scanResult') && document.getElementById('scanResult').style.display !== 'none'){
          const ss = document.getElementById('scanStatus');
          if(ss) ss.textContent = "Entered";
        }
        addAdminRecord('Entered', ticketState);
        alert("Vehicle entry marked successfully!");
      } catch(e){ console.error('btnMarkEntry error', e); }
    });
  }

  if(btnMarkExit){
    btnMarkExit.addEventListener('click', ()=>{
      try {
        if(!ticketState.hasTicket){ alert("No active ticket."); return; }
        const inGateView = (sectionadmin && sectionadmin.style.display === 'block');
        if(inGateView && !ticketState.scanned){ alert("Ticket not scanned at gate. Please scan ticket at gate before marking exit here."); return; }

        if(ticketState.area){ freeBox(ticketState.area, ticketState.spotIndex); }

        ticketState.status = "Exited";
        const ts = document.getElementById('ticketStatus');
        if(ts) ts.textContent = "🚗 Exited";
        if(document.getElementById('scanResult') && document.getElementById('scanResult').style.display !== 'none'){
          const ss = document.getElementById('scanStatus');
          if(ss) ss.textContent = "Exited";
        }
        addAdminRecord('Exited', ticketState);

        alert("Vehicle exit recorded and spot freed!");

        ///// NEW: remove from activeVehicles when exiting
        if(ticketState.vehicle){
          const normalized = ticketState.vehicle.toUpperCase().replace(/\s+/g,'');
          const idx = activeVehicles.indexOf(normalized);
          if(idx !== -1) activeVehicles.splice(idx,1);
        }

        // reset ticketState safely
        ticketState.hasTicket=false;
        ticketState.scanned=false;
        ticketState.status="Not Entered";
        ticketState.ticketId=null;
        ticketState.name=null;
        ticketState.vehicle=null;
        ticketState.type=null;
        ticketState.area=null;
        ticketState.expiry=null;
        ticketState.qrText=null;
        ticketState.spotIndex=null;

        const ticketContent = document.getElementById('ticketContent');
        const noTicket = document.getElementById('noTicket');
        if(ticketContent) ticketContent.style.display='none';
        if(noTicket) noTicket.style.display='block';

        // after exit, admin controls should hide since there's no active/verified ticket
        showAdminControls(false);
      } catch(e){ console.error('btnMarkExit error', e); }
    });
  }

  const btnScan = document.getElementById('btnScan');
  if(btnScan){
    btnScan.addEventListener('click', ()=>{
      try {
        const rawEl = document.getElementById('adminInput');
        const raw = rawEl ? rawEl.value : '';
        const val = raw ? raw.trim() : '';
        if(!val){ alert('Enter Ticket ID'); const sr = document.getElementById('scanResult'); if(sr) sr.style.display='none'; return; }
        if(!ticketState.hasTicket || !ticketState.ticketId){
          const sr = document.getElementById('scanResult');
          if(sr) sr.style.display='block';
          const sv = document.getElementById('scanVehicle'); if(sv) sv.textContent = '—';
          const sp = document.getElementById('scanSpot'); if(sp) sp.textContent = '—';
          const ss = document.getElementById('scanStatus'); if(ss) ss.textContent = 'Ticket not found';
          const qc = document.getElementById('ticketContent'); if(qc) qc.style.display='none';
          const nt = document.getElementById('noTicket'); if(nt) nt.style.display='block';
          // hide admin controls because no valid ticket
          showAdminControls(false);
          return;
        }
        if(val === ticketState.ticketId){
          ticketState.scanned = true;
          const sr = document.getElementById('scanResult'); if(sr) sr.style.display='block';
          const sv = document.getElementById('scanVehicle'); if(sv) sv.textContent = ticketState.vehicle || '—';
          const sp = document.getElementById('scanSpot'); if(sp) sp.textContent = (ticketState.area || '—').toUpperCase();
          const statusText = ticketState.status === 'Not Entered' ? 'Verified - Not Entered' : ticketState.status;
          const ss = document.getElementById('scanStatus'); if(ss) ss.textContent = statusText;

          const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
          set('ticketName', ticketState.name || '—');
          set('ticketVehicle', ticketState.vehicle || '—');
          set('ticketId', ticketState.ticketId || '—');
          set('ticketSpot', (ticketState.area || '—').toUpperCase());
          set('ticketType', ticketState.type || '—');
          set('ticketExpiry', ticketState.expiry || '—');
          set('ticketStatus', ticketState.status || 'Not Entered');

          const qrBox = document.getElementById('ticketQR');
          if(qrBox){ qrBox.innerHTML = ''; if(ticketState.qrText && typeof QRCode === 'function'){ new QRCode(qrBox, { text: ticketState.qrText, width:128, height:128 }); } }

          const ticketContent = document.getElementById('ticketContent');
          const noTicket = document.getElementById('noTicket');
          if(ticketContent) ticketContent.style.display='block';
          if(noTicket) noTicket.style.display='none';

          // When admin scans and verifies, show admin-only buttons
          showAdminControls(true);
        } else {
          ticketState.scanned = false;
          const sr = document.getElementById('scanResult'); if(sr) sr.style.display='block';
          const sv = document.getElementById('scanVehicle'); if(sv) sv.textContent='—';
          const sp = document.getElementById('scanSpot'); if(sp) sp.textContent='—';
          const ss = document.getElementById('scanStatus'); if(ss) ss.textContent='Ticket not found / Invalid ID';
          if(sectionadmin && sectionadmin.style.display === 'block'){
            const qc = document.getElementById('ticketContent'); if(qc) qc.style.display='none';
            const nt = document.getElementById('noTicket'); if(nt) nt.style.display='block';
          }
          // invalid scan => hide admin controls
          showAdminControls(false);
        }
      } catch(e){ console.error('btnScan error', e); }
    });
  }

  const btnDownloadReport = document.getElementById('btnDownloadReport');
  if(btnDownloadReport){
    btnDownloadReport.addEventListener('click', function() {
      try {
        // New header: separate Date and Time columns
        const header = ['Action','TicketID','Name','Vehicle','Type','Area','Date','Time'];
        const rows = adminRecords.map(r =>
          [r.action, r.id, r.name, r.vehicle, r.type, r.area ? r.area.toUpperCase() : '', r.date, r.time]
        );
        const csv = [header.join(','), ...rows.map(row => row.join(','))].join('\r\n');
        const blob = new Blob([csv],{type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'smart_parking_report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch(e){ console.error('btnDownloadReport error', e); alert('Failed to prepare CSV.'); }
    });
  }

  const btnClearDatabase = document.getElementById('btnClearDatabase');
  if(btnClearDatabase){
    btnClearDatabase.addEventListener('click', ()=>{
      try {
        alert('Database cleared (mock)');
        ticketState.hasTicket=false;
        ticketState.scanned=false;
        ticketState.status="Not Entered";
        ticketState.ticketId=null;
        ticketState.name=null;
        ticketState.vehicle=null;
        ticketState.type=null;
        ticketState.area=null;
        ticketState.expiry=null;
        ticketState.qrText=null;
        ticketState.spotIndex=null;

        ['campus','gate1','gate2'].forEach(a=>{ areaState[a].fill(false); });
        renderLiveSpots();

        const ticketContent = document.getElementById('ticketContent');
        const noTicket = document.getElementById('noTicket');
        if(ticketContent) ticketContent.style.display='none';
        if(noTicket) noTicket.style.display='block';
        const scanResult = document.getElementById('scanResult');
        if(scanResult) scanResult.style.display='none';
        const adminInput = document.getElementById('adminInput');
        if(adminInput) adminInput.value = '';
        const setEmpty = (id) => { const el = document.getElementById(id); if(el) el.textContent = '—'; };
        setEmpty('ticketName'); setEmpty('ticketId'); setEmpty('ticketSpot'); setEmpty('ticketVehicle'); setEmpty('ticketType');
        const ts = document.getElementById('ticketStatus'); if(ts) ts.textContent = 'Not Entered';
        const te = document.getElementById('ticketExpiry'); if(te) te.textContent = '—';
        const qrBox = document.getElementById('ticketQR'); if(qrBox) qrBox.innerHTML='';
        adminRecords.length = 0;

        ///// NEW: clear active vehicles tracker
        activeVehicles.length = 0;

        renderNotifications();

        // hide admin-only controls now that DB cleared
        showAdminControls(false);
      } catch(e){ console.error('btnClearDatabase error', e); }
    });
  }

  // initialization
  (function init(){
    try {
      if(sectionBooking) sectionBooking.style.display='block';
      if(sectionadmin) sectionadmin.style.display='none';
      const adminCard = document.getElementById('adminNotificationsCard');
      if(adminCard) adminCard.style.display='none';
      const ticketContent = document.getElementById('ticketContent');
      if(ticketContent) ticketContent.style.display='none';
      const noTicket = document.getElementById('noTicket');
      if(noTicket) noTicket.style.display='block';
      const scanResult = document.getElementById('scanResult');
      if(scanResult) scanResult.style.display='none';
      renderLiveSpots();
      renderNotifications();

      // ensure admin-only buttons hidden on initial load
      showAdminControls(false);
    } catch(e){ console.error('init error', e); }
  })();

  ///// NEW: Download QR / Ticket image logic
  function downloadQRCodeImage(filename = 'ticket.png') {
    try {
      const qrBox = document.getElementById('ticketQR');
      if(!qrBox) { alert('QR not available'); return; }

      // QRCode.js may render an <img> or a <canvas> inside qrBox
      const img = qrBox.querySelector('img');
      const canvas = qrBox.querySelector('canvas');

      if(img && img.src){
        const a = document.createElement('a');
        a.href = img.src;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      if(canvas){
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // fallback: try to draw from QR text to a temporary canvas
      if(ticketState.qrText && typeof QRCode === 'function'){
        const temp = document.createElement('div');
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        try{
          const q = new QRCode(temp, { text: ticketState.qrText, width:256, height:256 });
          const timg = temp.querySelector('img');
          const tcanvas = temp.querySelector('canvas');
          if(timg && timg.src){
            const a = document.createElement('a');
            a.href = timg.src;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            document.body.removeChild(temp);
            return;
          }
          if(tcanvas){
            const dataURL = tcanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            document.body.removeChild(temp);
            return;
          }
        } catch(e){
          console.error('QR fallback failed', e);
        }
        document.body.removeChild(temp);
      }

      alert('Unable to locate QR image to download.');
    } catch(e){ console.error('downloadQRCodeImage error', e); alert('Failed to download QR.'); }
  }

  // wire up the Download Ticket button (added in HTML)
  if(btnDownloadTicket){
    btnDownloadTicket.addEventListener('click', function(){
      try {
        if(!ticketState.hasTicket || !ticketState.ticketId){
          alert('No active ticket to download.');
          return;
        }
        const fname = (ticketState.ticketId ? ticketState.ticketId : 'ticket') + '.png';
        downloadQRCodeImage(fname);
      } catch(e){ console.error('btnDownloadTicket error', e); }
    });
  }

});
