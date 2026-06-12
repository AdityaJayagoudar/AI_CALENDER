/* ══════════════════════════════════════
   script.js  —  AI Calendar (with Backend)
   Connects to Express + MongoDB API
══════════════════════════════════════ */

const API = 'http://localhost:5001/api';

function localFmt(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function parseLocal(ds){const[y,m,d]=ds.split('-').map(Number);return new Date(y,m-1,d);}
function fmtDisp(ds){const d=parseLocal(ds);return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;}
function fmtTime(t){const[h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getToken(){return localStorage.getItem('cal_token');}
function setToken(t){localStorage.setItem('cal_token',t);}
function clearToken(){localStorage.removeItem('cal_token');}
function authHeaders(){return{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`};}

const today=new Date();
const todayStr=localFmt(today);
let curYear=today.getFullYear(),curMonth=today.getMonth();
let selDate=todayStr,attendees=[],micListening=false,editingId=null;
let events=[];
const DOT_COLORS={blue:'#3B82F6',green:'#16A34A',amber:'#D97706',purple:'#7C3AED',red:'#DC2626'};
const slotLabels = {
  '06:00': { label: 'Early morning quiet hours',         conf: 'low'    },
  '07:00': { label: 'Pre-work focus session',            conf: 'low'    },
  '08:00': { label: 'Early bird advantage',              conf: 'medium' },
  '08:30': { label: 'Morning kickstart window',          conf: 'medium' },
  '09:00': { label: 'Optimal morning focus time',        conf: 'high'   },
  '09:30': { label: 'Peak alertness period',             conf: 'high'   },
  '10:00': { label: 'Peak productivity hours',           conf: 'high'   },
  '10:30': { label: 'High energy collaboration window',  conf: 'high'   },
  '11:00': { label: 'Pre-lunch clarity window',          conf: 'high'   },
  '11:30': { label: 'Late morning momentum',             conf: 'medium' },
  '12:00': { label: 'Lunch break catch-up slot',         conf: 'low'    },
  '12:30': { label: 'Midday quick sync',                 conf: 'low'    },
  '13:00': { label: 'Post-lunch energy reset',           conf: 'medium' },
  '13:30': { label: 'Afternoon warm-up period',          conf: 'medium' },
  '14:00': { label: 'Afternoon collaboration time',      conf: 'high'   },
  '14:30': { label: 'Creative thinking window',          conf: 'high'   },
  '15:00': { label: 'Good for team meetings',            conf: 'high'   },
  '15:30': { label: 'Mid-afternoon sync slot',           conf: 'medium' },
  '16:00': { label: 'End-of-day wrap up',                conf: 'medium' },
  '16:30': { label: 'Late afternoon review time',        conf: 'medium' },
  '17:00': { label: 'End-of-business standup',           conf: 'low'    },
  '17:30': { label: 'After-hours quick check-in',        conf: 'low'    },
  '18:00': { label: 'Evening planning session',          conf: 'low'    },
};

function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}
async function showCalendar(){showPage('calendar-page');await loadAllMeetings();renderCal();renderMeetings();renderAI();}
function showVoice(){showPage('voice-page');}
function showSignup(){showPage('signup-page');}
function showLogin(){showPage('login-page');}

async function doSignup(){
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-pass').value;
  const confirm  = document.getElementById('signup-confirm').value;
  const errEl    = document.getElementById('signup-error');

  // Hide error first
  errEl.style.display = 'none';

  // Validate
  if(!name || !email || !password || !confirm){
    errEl.textContent = 'Please fill in all fields.';
    errEl.style.display = 'block';
    return;
  }
  if(password.length < 6){
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }
  if(password !== confirm){
    errEl.textContent = 'Passwords do not match!';
    errEl.style.display = 'block';
    return;
  }

  try{
    const res  = await fetch(`${API}/auth/register`,{
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({name, email, password}),
    });
    const data = await res.json();

    if(!res.ok){
      errEl.textContent = data.message || 'Registration failed.';
      errEl.style.display = 'block';
      return;
    }

    // Auto login after signup
    setToken(data.token);
    document.getElementById('user-email').textContent = data.user.email;

    // Clear signup form
    document.getElementById('signup-name').value    = '';
    document.getElementById('signup-email').value   = '';
    document.getElementById('signup-pass').value    = '';
    document.getElementById('signup-confirm').value = '';

    showToast('Account created successfully! Welcome 🎉');
    showCalendar();

  }catch(err){
    errEl.textContent = 'Cannot reach server. Is the backend running?';
    errEl.style.display = 'block';
  }
}

async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-pass').value;
  if(!email||!password){showToast('Please enter email and password.');return;}
  try{
    const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await res.json();
    if(!res.ok){showToast(data.message||'Login failed.');return;}
    setToken(data.token);
    document.getElementById('user-email').textContent=data.user.email;
    await showCalendar();
    startMeetingWatcher();
  }catch(err){showToast('Cannot reach server. Is the backend running?');}
}

async function demoLogin(){
  try{
    await fetch(`${API}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Demo User',email:'demo@example.com',password:'demo1234'})});
    const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'demo@example.com',password:'demo1234'})});
    const data=await res.json();
    if(!res.ok){showToast(data.message||'Demo login failed.');return;}
    setToken(data.token);
    document.getElementById('user-email').textContent=data.user.email;
    await showCalendar();
    startMeetingWatcher();
  }catch(err){showToast('Cannot reach server. Is the backend running?');}
}

function doLogout(){clearToken();events=[];showPage('login-page');}

async function loadAllMeetings(){
  try{
    const res=await fetch(`${API}/meetings`,{headers:authHeaders()});
    const data=await res.json();
    if(res.ok) events=data.data.map(m=>({...m,id:m._id}));
  }catch(err){console.error('Could not load meetings:',err);}
}

async function createMeeting(payload){
  const res=await fetch(`${API}/meetings`,{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)});
  return await res.json();
}
async function updateMeetingAPI(id,payload){
  const res=await fetch(`${API}/meetings/${id}`,{method:'PUT',headers:authHeaders(),body:JSON.stringify(payload)});
  return await res.json();
}
async function deleteMeetingAPI(id){
  const res=await fetch(`${API}/meetings/${id}`,{method:'DELETE',headers:authHeaders()});
  return await res.json();
}

function renderCal(){
  document.getElementById('cal-title').textContent=`${MONTHS[curMonth]} ${curYear}`;
  const first=new Date(curYear,curMonth,1),last=new Date(curYear,curMonth+1,0);
  const startDay=first.getDay(),prevLast=new Date(curYear,curMonth,0);
  let html='';
  for(let i=startDay-1;i>=0;i--) html+=`<div class="cell other"><div class="cell-num">${prevLast.getDate()-i}</div></div>`;
  for(let d=1;d<=last.getDate();d++){
    const ds=`${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===todayStr,isSel=ds===selDate,evs=events.filter(e=>e.date===ds);
    let cls='cell'; if(isToday)cls+=' today'; if(isSel)cls+=' selected';
    const numHtml=isToday?`<div class="cell-num-today">${d}</div>`:`<div class="cell-num">${d}</div>`;
    html+=`<div class="${cls}" onclick="selectDay('${ds}')">${numHtml}<div class="cell-evts">
      ${evs.slice(0,2).map(e=>`<div class="cell-evt evt-${e.color}">${fmtTime(e.start).split(' ')[0]} ${e.title.slice(0,8)}…</div>`).join('')}
      ${evs.length>2?`<div style="font-size:10px;color:var(--tx3)">+${evs.length-2} more</div>`:''}</div></div>`;
  }
  const rem=(7-(last.getDay()+1)%7)%7;
  for(let d=1;d<=rem;d++) html+=`<div class="cell other"><div class="cell-num">${d}</div></div>`;
  document.getElementById('cal-cells').innerHTML=html;
}

function navMonth(dir){curMonth+=dir;if(curMonth>11){curMonth=0;curYear++;}if(curMonth<0){curMonth=11;curYear--;}renderCal();}
function selectDay(ds){selDate=ds;document.getElementById('ev-date').value=fmtDisp(ds);renderCal();renderMeetings();renderAI();}

function renderMeetings(){
  const evs=events.filter(e=>e.date===selDate).sort((a,b)=>a.start.localeCompare(b.start));
  document.getElementById('meetings-title').textContent=`Meetings on ${fmtDisp(selDate).replace(/^\w+,\s/,'')}`;
  if(!evs.length){document.getElementById('meetings-body').innerHTML=`<div class="no-meetings"><div class="no-meetings-icon">📭</div>No meetings for this day.<br>Use the form to schedule one!</div>`;return;}
  document.getElementById('meetings-body').innerHTML=evs.map(e=>`
    <div class="meeting-item">
      <div class="mi-top">
        <div class="mi-title" style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${DOT_COLORS[e.color]||'#3B82F6'};flex-shrink:0;display:inline-block;"></span>${e.title}
        </div>
        <div class="mi-actions">
          <button class="icon-btn edit" onclick="editMeeting('${e.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-btn del" onclick="delMeeting('${e.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </div>
      <div class="mi-meta">
        <div class="mi-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${fmtTime(e.start)} – ${fmtTime(e.end)}</div>
        ${e.attendees&&e.attendees.length?`<div class="mi-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>${e.attendees.length} attendee${e.attendees.length!==1?'s':''}</div>`:''}
      </div>
      ${e.attendees&&e.attendees.length?`<div class="mi-tags">${e.attendees.map(a=>`<span class="mi-tag">${a}</span>`).join('')}</div>`:''}
      ${e.desc?`<div class="mi-desc">${e.desc}</div>`:''}

      ${e.meetingLink ? (() => {
        const t = detectLinkType(e.meetingLink);
        return `<a href="${e.meetingLink}" target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:5px 12px;border-radius:20px;background:${t.bg};color:${t.color};font-size:12px;font-weight:600;text-decoration:none;transition:opacity 0.15s;"
          onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg>
          Join ${t.label}
        </a>`;
      })() : ''}

      <!-- AI Notes Section -->
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:11.5px;font-weight:700;color:var(--tx2);display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.04em;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="color:var(--purple)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            AI Meeting Notes
          </span>
          <button onclick="generateNotes('${e.id}')" id="notebtn-${e.id}"
            style="display:flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;border:1.5px solid var(--purple);background:var(--purple-ultra);color:var(--purple);font-size:11.5px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.15s;"
            onmouseover="this.style.background='var(--purple)';this.style.color='#fff'"
            onmouseout="this.style.background='var(--purple-ultra)';this.style.color='var(--purple)'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Generate Notes
          </button>
        </div>
        <div id="notes-${e.id}" style="display:none;"></div>
      </div>

    </div>`).join('');
}

async function delMeeting(id){
  const result=await deleteMeetingAPI(id);
  if(result.success){events=events.filter(e=>e.id!==id);renderCal();renderMeetings();renderAI();showToast('Meeting deleted.');}
  else showToast(result.message||'Could not delete.');
}

function editMeeting(id){
  const e=events.find(x=>x.id===id);if(!e)return;
  editingId=id;
  document.getElementById('ev-title').value=e.title;
  document.getElementById('ev-date').value=fmtDisp(e.date);
  document.getElementById('ev-start').value=e.start;
  document.getElementById('ev-end').value=e.end;
  document.getElementById('ev-desc').value=e.desc||'';
  attendees=[...(e.attendees||[])];renderChips();selDate=e.date;
  document.getElementById('ev-title').scrollIntoView({behavior:'smooth'});
  document.getElementById('ev-title').focus();
}

function getISTTime() {
  // Get current time in IST (UTC+5:30)
  // Works correctly on any device regardless of local timezone
  const now    = new Date();
  const utc    = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist    = new Date(utc + (5.5 * 60 * 60 * 1000));
  const hour   = String(ist.getHours()).padStart(2, '0');
  const min    = String(ist.getMinutes()).padStart(2, '0');
  const date   = `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}-${String(ist.getDate()).padStart(2,'0')}`;
  return { time: `${hour}:${min}`, date };
}

function renderAI(){
  const taken = events.filter(e => e.date === selDate).map(e => e.start);

  // Get current IST time and date
  const ist = getISTTime();

  // Filter slots:
  // 1. Not already taken by a meeting
  // 2. If selected date is TODAY → only show future slots (after current IST time)
  // 3. If selected date is FUTURE → show all available slots
  const free = Object.keys(slotLabels).filter(slot => {
    if (taken.includes(slot)) return false;

    // If viewing today → hide slots that have already passed
    if (selDate === ist.date) {
      return slot > ist.time;
    }

    return true; // future dates — show all free slots
  });

  if (free.length === 0) {
    // No slots available — all taken or all passed
    const msg = selDate === ist.date
      ? 'No more free slots available today.'
      : 'All time slots are booked for this day.';
    document.getElementById('ai-sug-list').innerHTML = `
      <div style="text-align:center;padding:16px;color:var(--tx3);font-size:13px;">
        <div style="font-size:24px;margin-bottom:8px;">😔</div>
        ${msg}
      </div>`;
    return;
  }

  // Show current IST time badge at top when viewing today
  const istBadge = selDate === ist.date ? `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:var(--r-md);margin-bottom:10px;font-size:12px;color:#15803D;font-weight:500;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      IST Now: ${formatISTDisplay(ist.time)} — showing future slots only
    </div>` : `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:var(--r-md);margin-bottom:10px;font-size:12px;color:#1D4ED8;font-weight:500;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Future date — showing all available slots
    </div>`;

  const suggestions = free.slice(0, 6).map(t => ({
    time:  t,
    label: slotLabels[t].label,
    conf:  slotLabels[t].conf,
  }));

  document.getElementById('ai-sug-list').innerHTML = istBadge + suggestions.map(s => {
    const confLabel = s.conf==='high'?'high confidence':s.conf==='medium'?'medium confidence':'low confidence';
    const confClass = s.conf==='high'?'conf-high':s.conf==='medium'?'conf-med':'conf-low';
    return `<div class="sug-item" onclick="pickSlot('${s.time}')">
      <div class="sug-top">
        <div class="sug-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${s.time}
          <span style="font-size:10px;color:var(--tx3);font-family:inherit;font-weight:400;">(${formatISTDisplay(s.time)} IST)</span>
        </div>
        <span class="conf ${confClass}">${confLabel}</span>
      </div>
      <div class="sug-label">${s.label}</div>
    </div>`;
  }).join('');
}

function formatISTDisplay(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm   = h < 12 ? 'AM' : 'PM';
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function pickSlot(t){
  document.getElementById('ev-start').value=t;
  const[h,m]=t.split(':').map(Number);
  document.getElementById('ev-end').value=`${String(h+1).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  checkConflict();document.getElementById('ev-title').focus();
}

function addAtt(){const inp=document.getElementById('att-input');const v=inp.value.trim();if(!v)return;attendees.push(v);inp.value='';renderChips();}
function removeAtt(i){attendees.splice(i,1);renderChips();}
function renderChips(){document.getElementById('chips').innerHTML=attendees.map((a,i)=>`<div class="chip">${a}<button class="chip-x" onclick="removeAtt(${i})">×</button></div>`).join('');}
function checkConflict(){
  const s=document.getElementById('ev-start').value,e=document.getElementById('ev-end').value;
  const conflict=events.some(ev=>ev.date===selDate&&ev.start<e&&ev.end>s&&(!editingId||ev.id!==editingId));
  document.getElementById('conflict-alert').classList.toggle('show',conflict);
}

async function scheduleMeeting(){
  const titleEl=document.getElementById('ev-title');
  const title=titleEl.value.trim();
  if(!title){titleEl.style.borderColor='var(--red)';titleEl.focus();return;}
  titleEl.style.borderColor='';
  if(!selDate){showToast('Please select a date.');return;}
  const colorKeys=['blue','green','amber','purple','red'];
  const payload={title,date:selDate,start:document.getElementById('ev-start').value,end:document.getElementById('ev-end').value,color:colorKeys[Math.floor(Math.random()*colorKeys.length)],attendees:[...attendees],desc:document.getElementById('ev-desc').value.trim()};
  try{
    const result=editingId?await updateMeetingAPI(editingId,payload):await createMeeting(payload);
    if(!result.success){showToast(result.message||'Could not save meeting.');return;}
    titleEl.value='';document.getElementById('ev-desc').value='';document.getElementById('ev-start').value='09:00';document.getElementById('ev-end').value='10:00';
    attendees=[];editingId=null;renderChips();document.getElementById('conflict-alert').classList.remove('show');
    await loadAllMeetings();renderCal();renderMeetings();renderAI();
    showToast('Meeting scheduled successfully!');
  }catch(err){showToast('Cannot reach server. Is the backend running?');}
}

function toggleMic(){
  micListening=!micListening;
  const btn=document.getElementById('mic-btn'),hint=document.getElementById('mic-hint');
  if(micListening){
    btn.classList.add('listening');hint.textContent='Listening… speak now';
    if('webkitSpeechRecognition' in window||'SpeechRecognition' in window){
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition,recog=new SR();
      recog.lang='en-US';recog.interimResults=false;recog.maxAlternatives=1;
      recog.onresult=e=>{document.getElementById('voice-input').value=e.results[0][0].transcript;toggleMic();sendVoiceCmd();};
      recog.onerror=()=>{toggleMic();showToast('Could not access microphone.');};
      recog.onend=()=>{if(micListening)toggleMic();};recog.start();
    }else{setTimeout(()=>{toggleMic();showToast('Speech not supported. Please type.');},1500);}
  }else{btn.classList.remove('listening');hint.textContent='Click the microphone or type below';}
}

function parseNLP(text){
  const t=text.toLowerCase();
  const dayMap={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};

  // Always get fresh date (not stale page-load date)
  const now = new Date();
  let date  = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if(t.includes('today')){
    // today stays as today — already set above
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if(t.includes('tomorrow')){
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
  } else if(t.includes('next week')){
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate()+7);
  } else {
    for(const[name,idx]of Object.entries(dayMap)){
      if(t.includes(name)){
        const cur=now.getDay();
        const diff=(idx-cur+7)%7||7;
        date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+diff);
        break;
      }
    }
  }
  const ds=localFmt(date);
  let start='09:00',end='10:00';
  const tm=t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if(tm){let h=parseInt(tm[1]);const m=tm[2]?parseInt(tm[2]):0,ap=tm[3];if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;
    start=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const durMatch=t.match(/(\d+)\s*hour/);const dur=durMatch?parseInt(durMatch[1]):t.includes('30 min')?0.5:1;
    end=`${String(h+Math.floor(dur)).padStart(2,'0')}:${String(m+(dur%1)*60).padStart(2,'0')}`;}
  let attendeesList=[];
  const ns=text.match(/\bwith\s+([A-Z][a-z]+(?:[,\s]+(?:and\s+)?[A-Z][a-z]+)*)/)||text.match(/\binvite\s+([A-Z][a-z]+(?:[,\s]+(?:and\s+)?[A-Z][a-z]+)*)/)||text.match(/\binclude\s+([A-Z][a-z]+(?:[,\s]+(?:and\s+)?[A-Z][a-z]+)*)/);
  if(ns)attendeesList=ns[1].replace(/\band\b/gi,'').split(/[,\s]+/).map(n=>n.trim()).filter(n=>n.length>1);
  let cleanText=text.replace(/\b(with|invite|include)\s+[A-Z][a-z]+(?:[,\s]+(?:and\s+)?[A-Z][a-z]+)*/g,'').trim();
  const tm2=cleanText.match(/^(?:schedule|create|book|add|set up)?\s*(?:a\s+)?(.+?)(?:\s+(?:tomorrow|today|next|on\s+|at\s+\d|\bfor\b))/i);
  const rawTitle=tm2?tm2[1].trim().replace(/^(a |an )/i,''):cleanText.replace(/at\s+\d.*/i,'').replace(/^(schedule|create|book|add)\s*/i,'').trim();
  return{title:rawTitle.charAt(0).toUpperCase()+rawTitle.slice(1),date:ds,start,end,attendees:attendeesList};
}

async function sendVoiceCmd(){
  const inp=document.getElementById('voice-input');const cmd=inp.value.trim();if(!cmd)return;inp.value='';
  const parsed=parseNLP(cmd);
  const colorKeys=['blue','green','amber','purple','red'];
  try{
    const result=await createMeeting({...parsed,color:colorKeys[Math.floor(Math.random()*colorKeys.length)],desc:'',meetingLink:''});

    if(!result.success){
      document.getElementById('ai-resp-text').textContent=result.conflicts
        ?`Conflict with "${result.conflicts[0].title}". Try a different time.`
        :result.message;
      return;
    }

    const attPart = parsed.attendees.length ? ` with ${parsed.attendees.join(', ')}` : '';
    const confirmMsg = `Done! Scheduled "${parsed.title}"${attPart} on ${fmtDisp(parsed.date)} at ${fmtTime(parsed.start)} – ${fmtTime(parsed.end)}.`;
    document.getElementById('ai-resp-text').textContent = confirmMsg;

    // Update selDate AND calendar month/year to the scheduled date
    selDate  = parsed.date;
    const pd = parseLocal(parsed.date);
    curYear  = pd.getFullYear();
    curMonth = pd.getMonth();

    // Update the date field in the form too
    const dateFld = document.getElementById('ev-date');
    if(dateFld) dateFld.value = fmtDisp(parsed.date);

    // Load fresh meetings from server
    await loadAllMeetings();

    // Show confirmation for 2 seconds then go to calendar
    setTimeout(() => {
      // Switch to calendar page
      showPage('calendar-page');

      // Re-render everything with the correct date selected
      renderCal();
      renderMeetings();
      renderAI();

      // Scroll meetings list into view
      const meetingsCard = document.getElementById('meetings-body');
      if(meetingsCard) meetingsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

      showToast(`Meeting "${parsed.title}" scheduled ✅`);
    }, 2000);

  }catch(err){
    document.getElementById('ai-resp-text').textContent='Cannot reach server. Is the backend running?';
  }
}


function showForgot(){
  // Reset to step 1 every time
  document.getElementById('forgot-step1').style.display='block';
  document.getElementById('forgot-step2').style.display='none';
  document.getElementById('forgot-email').value='';
  document.getElementById('forgot-error').style.display='none';
  showPage('forgot-page');
}

async function doForgot(){
  const email  = document.getElementById('forgot-email').value.trim();
  const errEl  = document.getElementById('forgot-error');
  errEl.style.display='none';

  if(!email){
    errEl.textContent='Please enter your email address.';
    errEl.style.display='block';
    return;
  }

  try{
    const res  = await fetch(`${API}/auth/forgot`,{
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({email}),
    });
    const data = await res.json();

    if(!res.ok){
      errEl.textContent = data.message || 'Email not found.';
      errEl.style.display='block';
      return;
    }

    // Email found — show step 2 (new password form)
    document.getElementById('reset-email').value = email;
    document.getElementById('forgot-step1').style.display='none';
    document.getElementById('forgot-step2').style.display='block';

  }catch(err){
    errEl.textContent='Cannot reach server. Is the backend running?';
    errEl.style.display='block';
  }
}

async function doResetPassword(){
  const email   = document.getElementById('reset-email').value.trim();
  const password= document.getElementById('reset-pass').value;
  const confirm = document.getElementById('reset-confirm').value;
  const errEl   = document.getElementById('reset-error');
  errEl.style.display='none';

  if(!password || !confirm){
    errEl.textContent='Please fill in all fields.';
    errEl.style.display='block';
    return;
  }
  if(password.length < 6){
    errEl.textContent='Password must be at least 6 characters.';
    errEl.style.display='block';
    return;
  }
  if(password !== confirm){
    errEl.textContent='Passwords do not match!';
    errEl.style.display='block';
    return;
  }

  try{
    const res  = await fetch(`${API}/auth/resetpassword`,{
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({email, password}),
    });
    const data = await res.json();

    if(!res.ok){
      errEl.textContent = data.message || 'Could not reset password.';
      errEl.style.display='block';
      return;
    }

    // Success — go back to login
    showToast('Password reset successfully! Please sign in. ✅');
    document.getElementById('login-email').value = email;
    showLogin();

  }catch(err){
    errEl.textContent='Cannot reach server. Is the backend running?';
    errEl.style.display='block';
  }
}


/* ─────────────────────────────────────
   HISTORY
───────────────────────────────────── */
let allHistory = [];
let currentFilter = 'all';

async function showHistory() {
  showPage('history-page');
  await loadHistory();
}

async function loadHistory() {
  try {
    const res  = await fetch(`${API}/meetings/history`, { headers: authHeaders() });
    const data = await res.json();
    if (res.ok) {
      allHistory = data.data.map(m => ({ ...m, id: m._id }));
      renderHistoryStats();
      renderHistoryList(currentFilter);
    }
  } catch (err) {
    console.error('Could not load history:', err);
  }
}

function renderHistoryStats() {
  const total     = allHistory.length;
  const active    = allHistory.filter(m => m.status === 'active').length;
  const completed = allHistory.filter(m => m.status === 'completed').length;
  const cancelled = allHistory.filter(m => m.status === 'cancelled').length;

  document.getElementById('history-stats').innerHTML = `
    <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:var(--purple)">${total}</div>
      <div style="font-size:13px;color:var(--tx2);margin-top:4px;font-weight:500;">Total Meetings</div>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#2563EB">${active}</div>
      <div style="font-size:13px;color:var(--tx2);margin-top:4px;font-weight:500;">Upcoming</div>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#16A34A">${completed}</div>
      <div style="font-size:13px;color:var(--tx2);margin-top:4px;font-weight:500;">Completed</div>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#DC2626">${cancelled}</div>
      <div style="font-size:13px;color:var(--tx2);margin-top:4px;font-weight:500;">Cancelled</div>
    </div>
  `;
}

function filterHistory(filter) {
  currentFilter = filter;

  // Update tab styles
  ['all','active','completed','cancelled'].forEach(f => {
    const tab = document.getElementById('tab-' + f);
    if (!tab) return;
    if (f === filter) {
      tab.style.background  = 'var(--purple)';
      tab.style.color       = '#fff';
      tab.style.borderColor = 'var(--purple)';
      tab.style.fontWeight  = '600';
    } else {
      tab.style.background  = '#fff';
      tab.style.color       = 'var(--tx2)';
      tab.style.borderColor = 'var(--border)';
      tab.style.fontWeight  = '500';
    }
  });

  renderHistoryList(filter);
}

function renderHistoryList(filter) {
  const list = filter === 'all'
    ? allHistory
    : allHistory.filter(m => m.status === filter);

  const el = document.getElementById('history-list');

  if (!list.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:#fff;border-radius:var(--r-xl);border:1px solid var(--border);">
        <div style="font-size:48px;margin-bottom:12px;">📭</div>
        <div style="font-size:15px;color:var(--tx2);font-weight:500;">No ${filter === 'all' ? '' : filter} meetings found</div>
        <div style="font-size:13px;color:var(--tx3);margin-top:6px;">Meetings will appear here after they are completed or cancelled</div>
      </div>`;
    return;
  }

  const statusColors = {
    active:    { bg: '#DBEAFE', color: '#1D4ED8', label: '🗓 Upcoming'  },
    completed: { bg: '#DCFCE7', color: '#15803D', label: '✅ Completed' },
    cancelled: { bg: '#FEE2E2', color: '#DC2626', label: '❌ Cancelled' },
  };
  const dotColors = { blue:'#3B82F6', green:'#16A34A', amber:'#D97706', purple:'#7C3AED', red:'#DC2626' };

  el.innerHTML = `
    <div style="background:#fff;border-radius:var(--r-xl);border:1px solid var(--border);overflow:hidden;">
      <div style="padding:16px 24px;border-bottom:1px solid var(--border);font-size:14px;color:var(--tx2);font-weight:500;">
        Showing ${list.length} meeting${list.length !== 1 ? 's' : ''}
      </div>
      ${list.map(m => {
        const sc = statusColors[m.status] || statusColors.completed;
        return `
        <div style="padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:16px;transition:background 0.15s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:10px;height:10px;border-radius:50%;background:${dotColors[m.color]||'#3B82F6'};flex-shrink:0;margin-top:5px;"></div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
              <div style="font-size:15px;font-weight:700;color:var(--tx1);">${m.title}</div>
              <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${sc.bg};color:${sc.color};">${sc.label}</span>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
              <div style="font-size:12.5px;color:var(--tx2);display:flex;align-items:center;gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${fmtDisp(m.date).replace(/^\w+,\s/,'')}
              </div>
              <div style="font-size:12.5px;color:var(--tx2);display:flex;align-items:center;gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${fmtTime(m.start)} – ${fmtTime(m.end)}
              </div>
              ${m.attendees && m.attendees.length ? `
              <div style="font-size:12.5px;color:var(--tx2);display:flex;align-items:center;gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                ${m.attendees.join(', ')}
              </div>` : ''}
            </div>
            ${m.desc ? `<div style="font-size:12px;color:var(--tx3);margin-top:6px;">${m.desc}</div>` : ''}
            ${m.status === 'cancelled' && m.cancelledAt ? `<div style="font-size:11.5px;color:var(--red);margin-top:6px;">Cancelled on ${new Date(m.cancelledAt).toLocaleDateString()}</div>` : ''}
            ${m.status === 'completed' ? `<div style="font-size:11.5px;color:var(--green);margin-top:6px;">Meeting completed</div>` : ''}
            ${m.meetingLink ? (() => {
              const t = detectLinkType(m.meetingLink);
              return `<a href="${m.meetingLink}" target="_blank" rel="noopener"
                style="display:inline-flex;align-items:center;gap:5px;margin-top:6px;padding:4px 10px;border-radius:20px;background:${t.bg};color:${t.color};font-size:11.5px;font-weight:600;text-decoration:none;">${t.label} link</a>`;
            })() : ''}
          </div>
          <button onclick="hardDeleteMeeting('${m.id}')" title="Permanently Delete"
            style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--tx3);transition:all 0.15s;display:flex;align-items:center;flex-shrink:0;"
            onmouseover="this.style.color='var(--red)';this.style.background='var(--red-bg)'"
            onmouseout="this.style.color='var(--tx3)';this.style.background='none'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>`;
      }).join('')}
    </div>
  `;
}

async function hardDeleteMeeting(id) {
  if (!confirm('Permanently delete this from history? This cannot be undone.')) return;
  try {
    const res = await fetch(`${API}/meetings/${id}/hard`, {
      method:  'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      allHistory = allHistory.filter(m => m.id !== id);
      renderHistoryStats();
      renderHistoryList(currentFilter);
      showToast('Permanently deleted from history.');
    }
  } catch (err) {
    showToast('Could not delete. Is backend running?');
  }
}


/* ─────────────────────────────────────
   SHOW / HIDE PASSWORD TOGGLE
───────────────────────────────────── */
function togglePassword(id) {
  const input  = document.getElementById(id);
  const eyeSvg = document.getElementById('eye-' + id);
  if (!input || !eyeSvg) return;

  const isPassword = input.type === 'password';

  // Toggle input type
  input.type = isPassword ? 'text' : 'password';

  // Swap eye icon — open eye when hidden, closed eye when visible
  if (isPassword) {
    // Password is now VISIBLE — show closed eye (slash through)
    eyeSvg.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    `;
  } else {
    // Password is now HIDDEN — show open eye
    eyeSvg.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }

  // Keep focus on input
  input.focus();
}


/* ─────────────────────────────────────
   MEETING LINK HELPERS
───────────────────────────────────── */
function detectLinkType(url) {
  if (!url) return null;
  if (url.includes('meet.google.com'))  return { label: 'Google Meet', color: '#1D4ED8', bg: '#DBEAFE' };
  if (url.includes('zoom.us'))          return { label: 'Zoom',        color: '#2563EB', bg: '#EFF6FF' };
  if (url.includes('teams.microsoft'))  return { label: 'Teams',       color: '#6D28D9', bg: '#EDE9FE' };
  if (url.includes('webex.com'))        return { label: 'Webex',       color: '#059669', bg: '#DCFCE7' };
  return { label: 'Join Meeting', color: '#6B7280', bg: '#F3F4F6' };
}

function pasteLink(type) {
  const input = document.getElementById('ev-link');
  const placeholders = {
    meet:  'https://meet.google.com/xxx-xxxx-xxx',
    zoom:  'https://zoom.us/j/xxxxxxxxxx',
    teams: 'https://teams.microsoft.com/l/meetup-join/...',
    webex: 'https://webex.com/meet/...',
  };
  input.placeholder = placeholders[type] || '';
  input.focus();
  updateLinkBadge();
}

function updateLinkBadge() {
  const input  = document.getElementById('ev-link');
  const badge  = document.getElementById('ev-link-badge');
  if (!input || !badge) return;
  const url    = input.value.trim();
  const type   = detectLinkType(url);
  if (url && type) {
    badge.textContent    = type.label;
    badge.style.display  = 'inline-block';
    badge.style.background = type.bg;
    badge.style.color    = type.color;
  } else {
    badge.style.display  = 'none';
  }
}


/* ─────────────────────────────────────
   AI MEETING NOTES GENERATOR
   Calls Claude API to generate smart
   point-wise notes with bold highlights
───────────────────────────────────── */
async function generateNotes(meetingId) {
  const meeting = events.find(e => e.id === meetingId);
  if (!meeting) return;

  const btn      = document.getElementById('notebtn-' + meetingId);
  const notesDiv = document.getElementById('notes-' + meetingId);
  if (!btn || !notesDiv) return;

  // Show loading state
  btn.disabled    = true;
  btn.innerHTML   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...`;
  notesDiv.style.display = 'block';
  notesDiv.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;padding:12px;background:var(--surface2);border-radius:var(--r-md);font-size:13px;color:var(--tx2);">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="animation:spin 1s linear infinite;flex-shrink:0;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      AI is generating smart notes for this meeting...
    </div>`;

  // Build prompt for Claude
  const prompt = `You are a professional meeting assistant. Generate important meeting notes for the following meeting:

Meeting Title: ${meeting.title}
Date: ${fmtDisp(meeting.date)}
Time: ${fmtTime(meeting.start)} to ${fmtTime(meeting.end)}
Attendees: ${meeting.attendees && meeting.attendees.length ? meeting.attendees.join(', ') : 'Not specified'}
Description/Agenda: ${meeting.desc || 'Not specified'}

Generate 6-8 important meeting notes as bullet points. Follow these rules strictly:
1. Each point must start with a bullet "•"
2. Each point on a new line
3. Wrap VERY important words or phrases in **double asterisks** like **this** so they can be bolded
4. Keep each point concise and actionable
5. Cover: objectives, key discussion topics, action items, decisions to be made, follow-ups
6. Make notes relevant to the meeting title and description
7. Return ONLY the bullet points, no headings, no extra text`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (!text) {
      notesDiv.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px;">Could not generate notes. Please try again.</div>`;
      return;
    }

    // Parse bullet points and convert **bold** to <strong>
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('•') || l.startsWith('-') || l.match(/^\d+\./));

    const html = lines.map((line, i) => {
      // Clean bullet character
      let clean = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '').trim();

      // Convert **text** → <strong>text</strong>
      clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--tx1);font-weight:700;">$1</strong>');

      return `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:var(--r-sm);background:${i%2===0?'var(--surface2)':'transparent'};margin-bottom:3px;transition:background 0.15s;"
          onmouseover="this.style.background='var(--purple-ultra)'"
          onmouseout="this.style.background='${i%2===0?'var(--surface2)':'transparent'}'">
          <span style="width:20px;height:20px;border-radius:50%;background:var(--purple);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i+1}</span>
          <span style="font-size:13px;color:var(--tx1);line-height:1.6;">${clean}</span>
        </div>`;
    }).join('');

    notesDiv.innerHTML = `
      <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:var(--r-md);padding:12px;margin-top:4px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:12px;font-weight:700;color:var(--purple);">✦ Smart Notes Generated</span>
          <button onclick="document.getElementById('notes-${meetingId}').style.display='none';resetNoteBtn('${meetingId}')"
            style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--tx3);padding:2px 6px;border-radius:4px;"
            onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--tx3)'">✕ Close</button>
        </div>
        ${html || '<div style="font-size:12px;color:var(--tx3);text-align:center;padding:8px;">No notes generated. Try adding a description to the meeting.</div>'}
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #DDD6FE;display:flex;gap:8px;">
          <button onclick="copyNotes('${meetingId}')"
            style="flex:1;padding:6px;border-radius:var(--r-sm);border:1px solid #DDD6FE;background:#fff;color:var(--purple);font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.15s;"
            onmouseover="this.style.background='var(--purple)';this.style.color='#fff'"
            onmouseout="this.style.background='#fff';this.style.color='var(--purple)'">
            📋 Copy Notes
          </button>
          <button onclick="generateNotes('${meetingId}')"
            style="flex:1;padding:6px;border-radius:var(--r-sm);border:1px solid #DDD6FE;background:#fff;color:var(--purple);font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.15s;"
            onmouseover="this.style.background='var(--purple)';this.style.color='#fff'"
            onmouseout="this.style.background='#fff';this.style.color='var(--purple)'">
            🔄 Regenerate
          </button>
        </div>
      </div>`;

    // Reset button
    resetNoteBtn(meetingId);

  } catch (err) {
    console.error('Notes generation error:', err);
    notesDiv.innerHTML = `
      <div style="background:var(--red-bg);border:1px solid #FCA5A5;border-radius:var(--r-sm);padding:10px;font-size:12.5px;color:var(--red);">
        ⚠️ Could not generate notes. Make sure your internet connection is active and try again.
      </div>`;
    resetNoteBtn(meetingId);
  }
}

function resetNoteBtn(meetingId) {
  const btn = document.getElementById('notebtn-' + meetingId);
  if (!btn) return;
  btn.disabled  = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Generate Notes`;
}

function copyNotes(meetingId) {
  const notesDiv = document.getElementById('notes-' + meetingId);
  if (!notesDiv) return;
  const text = notesDiv.innerText || notesDiv.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Notes copied to clipboard! 📋');
  }).catch(() => {
    showToast('Could not copy. Please select and copy manually.');
  });
}



/* ─────────────────────────────────────
   AUTO NOTES — triggers when meeting starts
   Checks every 60 seconds if any meeting
   is starting RIGHT NOW and auto-generates notes
───────────────────────────────────── */

// Track which meetings have already had notes auto-generated
// so we don't trigger twice for the same meeting
const autoNotesTriggered = new Set();

function checkMeetingStarting() {
  // Use IST time for meeting start detection
  const ist     = getISTTime();
  const nowDate = ist.date;
  const nowTime = ist.time;

  // Find meetings starting right now (within 1 minute window)
  const starting = events.filter(e => {
    if (e.date !== nowDate) return false;
    if (autoNotesTriggered.has(e.id)) return false;

    // Check if meeting start time matches current time (HH:MM)
    return e.start === nowTime;
  });

  starting.forEach(async e => {
    // Mark as triggered so it doesn't fire again
    autoNotesTriggered.add(e.id);

    // Show a notification toast
    showMeetingStartToast(e);

    // Wait 3 seconds then auto-generate notes
    setTimeout(async () => {
      // Make sure we are on calendar page and meeting card is visible
      if (selDate === e.date) {
        // Scroll to meeting card
        const noteBtn = document.getElementById('notebtn-' + e.id);
        if (noteBtn) {
          noteBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Auto generate notes
          await generateNotes(e.id);
        }
      } else {
        // If user is on a different date, still auto-generate silently
        await generateNotes(e.id);
      }
    }, 3000);
  });
}

function showMeetingStartToast(meeting) {
  const t = document.getElementById('toast');

  // Create a rich meeting start notification
  t.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--purple);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div>
        <div style="font-weight:700;font-size:13px;">🎯 Meeting Starting Now!</div>
        <div style="font-size:11.5px;opacity:0.85;margin-top:2px;">${meeting.title} — AI notes generating...</div>
      </div>
    </div>`;
  t.style.background = 'var(--purple)';
  t.style.padding    = '12px 18px';
  t.style.minWidth   = '280px';
  t.classList.add('show');

  // Hide after 6 seconds
  setTimeout(() => {
    t.classList.remove('show');
    // Reset toast to normal after animation
    setTimeout(() => {
      t.style.background = '';
      t.style.padding    = '';
      t.style.minWidth   = '';
      t.innerHTML = '';
    }, 400);
  }, 6000);
}

// Start the auto-check timer — runs every 60 seconds
function startMeetingWatcher() {
  // Run immediately on load
  checkMeetingStarting();
  // Then check every 60 seconds
  setInterval(checkMeetingStarting, 60000);
}


function showToast(msg){const t=document.getElementById('toast');t.textContent='✅ '+msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}

document.getElementById('login-email').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('login-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('ev-link').addEventListener('input', updateLinkBadge);

// Auto-login if token exists
(async()=>{
  if(getToken()){
    try{
      const res=await fetch(`${API}/auth/me`,{headers:authHeaders()});
      const data=await res.json();
      if(res.ok&&data.success){
        document.getElementById('user-email').textContent=data.user.email;
        await showCalendar();
        // Start auto-watcher AFTER calendar loads so events[] is populated
        startMeetingWatcher();
        return;
      }
    }catch(_){}
    clearToken();
  }
  selectDay(todayStr);
})();