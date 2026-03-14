/* ═══════════════════════════════════════════════════════════════
   CALLVORA AI CRM — script.js
   Security: All HTML output sanitised via escH(), inputs validated,
   Supabase parameterised queries for all DB operations.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── PASSWORD TOGGLE ──────────────────────────────────────────── */
function togglePw() { var i = document.getElementById('login-pass'), s = document.getElementById('eye-show'), h = document.getElementById('eye-hide'); if (i.type === 'password') { i.type = 'text'; s.style.display = 'none'; h.style.display = 'block'; } else { i.type = 'password'; h.style.display = 'none'; s.style.display = 'block'; } }

/* ── SUPABASE ─────────────────────────────────────────────────── */
var SUPA_URL = 'https://smfphvykjwdjzmsgrsdb.supabase.co';
var SUPA_KEY = 'sb_publishable_N3dCq7JfeuRL7Xlz5aZvtA__c6_Wn3P';
var _sb = null;
function getSB() { if (!_sb && window.supabase && window.supabase.createClient) { _sb = window.supabase.createClient(SUPA_URL, SUPA_KEY); } return _sb; }

/* ── GEMINI CONFIG ────────────────────────────────────────────── */
var GEMINI_KEY = ''; // REMOVED FOR SECURITY - NOW IN SUPABASE SECRETS
var GEMINI_URL = ''; // REMOVED FOR SECURITY - NOW HANDLED BY EDGE FUNCTION
var _aiLastCall = 0, AI_COOLDOWN_MS = 3000;

/* ── STATE ────────────────────────────────────────────────────── */
var STATE = {
  currentUser: null, currentPage: 'dashboard', vehicles: [], leads: [], calls: [], dealerships: [], users: [], expandedRow: null, vehicleSearch: '', vehicleFilter: '', leadFilter: '', callFilter: '', dealerDetailId: null, dealerDetailTab: 'overview', aiMessages: [], aiTyping: false,
  adminVSearch: '', adminVDealer: '', adminLSearch: '', adminLDealer: '', adminLScore: '', adminCSearch: '', adminCDealer: '', adminCOut: '', adminUSearch: '', adminUDealer: '', dSearch: '', dStat: '', dPlan: '', detVSearch: '', detLSearch: '', detLScore: '', detCSearch: '', detCOut: '', detUSearch: '',
  adminAnaDealer: '', aiDealerFilter: '', undoStack: [], redoStack: []
};
/* ── NAV DEFINITIONS ──────────────────────────────────────────── */
var CLIENT_NAV = [{ id: 'dashboard', label: 'Overview', icon: 'dashboard' }, { id: 'cars', label: 'Car Catalogue', icon: 'car' }, { id: 'leads', label: 'Leads', icon: 'users' }, { id: 'calls', label: 'Call Logs', icon: 'phone' }];
var ADMIN_NAV = [{ id: 'admin', label: 'Overview', icon: 'dashboard', section: 'Platform' }, { id: 'dealerships', label: 'Dealerships', icon: 'building', section: '' }, { id: 'recharge', label: 'Recharge', icon: 'zap', section: 'Billing' }, { id: 'analytics', label: 'Analytics', icon: 'chart', section: '' }, { id: 'all-vehicles', label: 'All Vehicles', icon: 'car', section: 'Data Tables' }, { id: 'all-leads', label: 'All Leads', icon: 'users', section: '' }, { id: 'all-calls', label: 'All Calls', icon: 'phone', section: '' }, { id: 'all-users', label: 'All Users', icon: 'shield', section: '' }, { id: 'ai-assistant', label: 'CallVora AI', icon: 'ai', section: 'Intelligence' }];
/* ── ICONS ────────────────────────────────────────────────────── */
function icon(n, sz) { sz = sz || 15; var M = { dashboard: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', car: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 17H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1l3-4h9l3 4h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>', users: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', phone: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 8C6.5 7.17 7.17 6.5 8 6.5h1.5c.28 0 .53.17.62.43L11.5 10l-1.5 1.25c.75 1.5 1.75 2.5 3.25 3.25L14.5 13l2.95 1.37c.27.12.43.37.43.63V16.5c0 .83-.67 1.5-1.5 1.5H16C10.48 18 6 13.52 6 8v-.5z"/></svg>', building: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>', chart: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', plus: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', pencil: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', trash: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>', chevron: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>', back: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>', flame: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>', snowflake: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>', check: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>', x: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', play: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>', zap: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', clock: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', toggle_on: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>', toggle_off: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>', arrowup: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>', search: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', save: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>', eye: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', shield: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', trending: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>', star: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', dollar: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', ai: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>', send: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>', robot: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V6"/><circle cx="12" cy="4" r="2"/><path d="M7 15h.01M17 15h.01M7 19h10"/></svg>', wallet: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>', receipt: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8M16 12H8M12 16H8"/></svg>', timer: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', user_plus: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>', refresh: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', bell: '<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>' }; return (M[n] || '').replace(/SZ/g, sz); }
/* ── SECURITY ─────────────────────────────────────────────────── */
function escH(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;'); }
function escQ(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function sanitizeText(s, n) { return String(s == null ? '' : s).slice(0, n || 500).trim(); }
function sanitizeInput(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').slice(0, 500); }
function validateEmail(e) { return /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/.test(e); }
function showToast(msg, type) { toast(msg, type || 'success'); }
function openModal(html) { var mc = document.getElementById('modal-container'); if (!mc) return; mc.innerHTML = '<div class="modal-bg" onclick="closeModal(event)"><div class="modal-card" onclick="event.stopPropagation()" style="max-height:85vh;overflow-y:auto">' + html + '</div></div>'; }

/* ── FORMAT HELPERS ───────────────────────────────────────────── */
function fmt(n) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0); }
function fmtCost(n) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n || 0); }
function fmtDate(s) { try { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s)); } catch (e) { return s || '–'; } }
function fmtDateShort(s) { if (!s) return '–'; try { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s)); } catch (e) { return s || '–'; } }
function fmtDuration(s) { var sec = parseInt(s, 10) || 0; return (sec / 60).toFixed(3) + ' min'; }
function fmtDurationFull(t) { var sec = parseInt(t, 10) || 0; return (sec / 60).toFixed(3) + ' min'; } function outcomeLabel(o) { return { BOOKED_VISIT: 'Booked Visit', FOLLOW_UP: 'Follow-up', NOT_INTERESTED: 'Not Interested', UNANSWERED: 'Unanswered' }[o] || o || '–'; }
function outcomeBadge(o) { return { BOOKED_VISIT: 'badge-success', FOLLOW_UP: 'badge-warm', NOT_INTERESTED: 'badge-neutral', UNANSWERED: 'badge-danger' }[o] || 'badge-neutral'; }
function scoreBadge(s) { return { HOT: 'badge-hot', WARM: 'badge-warm', COLD: 'badge-cold' }[s] || 'badge-neutral'; }
function planBadge(p) { return { ENTERPRISE: 'badge-warning', GROWTH: 'badge-info', STARTER: 'badge-neutral' }[p] || 'badge-neutral'; }
function roleBadge(r) { return { ADMIN: 'badge-admin', CLIENT: 'badge-neutral' }[r] || 'badge-neutral'; }

/* ── DATA NORMALIZERS ─────────────────────────────────────────── */
function nv(v) { return Object.assign({}, v, { fuelType: v.fuel_type || v.fuelType || '', isAvailable: v.is_available != null ? v.is_available : (v.isAvailable != null ? v.isAvailable : true), dealershipId: v.dealership_id || v.dealershipId || null, mileage: parseInt(v.mileage, 10) || 0, price: parseFloat(v.price) || 0, transmission: v.transmission || 'AUTOMATIC', description: v.description || '', make: v.make || '', model: v.model || '', year: v.year || '' }); }
function nl(l) { return Object.assign({}, l, { customerName: l.customer_name || l.customerName || '', phoneNumber: l.phone_number || l.customer_phone || l.phoneNumber || l.customerPhone || '', carInterested: l.car_interested || l.carInterested || '', visitDate: l.visit_date || l.visitDate || null, dealershipId: l.dealership_id || l.dealershipId || null, score: l.score || 'COLD', isContacted: l.is_contacted != null ? l.is_contacted : (l.isContacted || false), callSummary: l.call_summary || l.callSummary || '' }); }
function nc(c) { return Object.assign({}, c, { callerName: c.caller_name || c.callerName || '', callerPhone: c.caller_phone || c.callerPhone || '', recordingUrl: c.recording_url || c.recordingUrl || null, dealershipId: c.dealership_id || c.dealershipId || null, duration: parseInt(c.duration, 10) || 0, outcome: c.outcome || 'UNANSWERED', call_at: c.call_at || c.created_at || new Date().toISOString(), cost: parseFloat(c.cost) || 0, transcript: c.transcript || '' }); }
function nd(d) { return Object.assign({}, d, { isActive: d.is_active != null ? d.is_active : (d.isActive != null ? d.isActive : true), status: d.status || 'active', leads: parseInt(d.leads, 10) || 0, calls: parseInt(d.calls, 10) || 0, vehicles: parseInt(d.vehicles, 10) || 0, agent_id: d.agent_id || null, minute_limit: d.minute_limit || null, cycle_start_date: d.cycle_start_date || d.created_at || new Date().toISOString() }); } function nu(u) { return Object.assign({}, u, { dealershipId: u.dealership_id || u.dealershipId || null, name: u.name || u.email || '', role: u.role || 'CLIENT' }); }

/* ── TOAST ────────────────────────────────────────────────────── */
var _toastTimer = null;
function toast(msg, type) { type = type || 'success'; var t = document.getElementById('toast'); if (!t) return; document.getElementById('toast-msg').textContent = sanitizeText(msg, 200); document.getElementById('toast-dot').style.background = type === 'success' ? '#10b981' : type === 'error' ? '#f43f5e' : '#f59e0b'; t.classList.add('show'); if (_toastTimer) clearTimeout(_toastTimer); _toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800); }

/* ── MODAL HELPERS ────────────────────────────────────────────── */
function closeModal(e) { if (e && e.target && e.target.classList.contains('modal-bg')) closeModalDirect(); }
function closeModalDirect() { var mc = document.getElementById('modal-container'); if (mc) mc.innerHTML = ''; }
function showModalError(msg) { var el = document.getElementById('modal-error'); if (el) { el.textContent = sanitizeText(msg, 300); el.classList.remove('hidden'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }

/* ── LOGIN ────────────────────────────────────────────────────── */
var _loginAttempts = 0, _loginLockUntil = 0;
async function handleLogin() {
  var now = Date.now();
  if (now < _loginLockUntil) { showLoginError('Too many attempts. Wait ' + Math.ceil((_loginLockUntil - now) / 1000) + 's.'); return; }
  var emailRaw = (document.getElementById('login-email').value || '').toLowerCase().trim();
  var passRaw = document.getElementById('login-pass').value || '';

  if (!emailRaw || !passRaw) { showLoginError('Please enter your email and password.'); return; }
  if (!validateEmail(emailRaw)) { showLoginError('Please enter a valid email address.'); return; }
  if (passRaw.length < 6) { showLoginError('Password must be at least 6 characters.'); return; }

  var btn = document.getElementById('login-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>&nbsp;Signing in&hellip;';
  hideLoginError();

  try {
    var client = getSB();

    // Explicit error handling for missing Supabase library
    if (!client) {
      if (typeof window.supabase === 'undefined') {
        showLoginError('CRITICAL: Supabase library failed to load. Please fix the HTML <script> tag.');
      } else {
        showLoginError('Could not connect. Check your internet connection.');
      }
      resetLoginBtn();
      return;
    }

    var authRes = await client.auth.signInWithPassword({ email: emailRaw, password: passRaw });
    if (authRes.error) { _loginAttempts++; if (_loginAttempts >= 5) { _loginLockUntil = Date.now() + 60000; _loginAttempts = 0; showLoginError('Too many failed attempts. Locked for 60 seconds.'); } else { showLoginError(authRes.error.message); } resetLoginBtn(); return; }
    _loginAttempts = 0;
    var uid = authRes.data.user.id, role = 'CLIENT', name = emailRaw, dealershipId = null;
    var uRes = await client.from('users').select('*').eq('id', uid).maybeSingle();
    
    if (uRes.error) {
      console.error('CRITICAL: RLS or Database error fetching user role:', uRes.error);
    }
    
    if (!uRes.error && uRes.data) {
      role = String(uRes.data.role || 'CLIENT').toUpperCase(); 
      name = uRes.data.name || emailRaw; 
      dealershipId = uRes.data.dealership_id || null; 
    }
    STATE.currentUser = { id: uid, email: emailRaw, role: role, name: name, dealershipId: dealershipId };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    initApp();
  } catch (err) { showLoginError('Unexpected error. Please try again.'); console.error('Login:', err.message); resetLoginBtn(); }
}

function resetLoginBtn() { var b = document.getElementById('login-btn'); if (!b) return; b.disabled = false; b.innerHTML = 'Sign in <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'; }
function showLoginError(msg) { document.getElementById('login-error-msg').textContent = sanitizeText(msg, 300); document.getElementById('login-error').classList.remove('hidden'); }
function hideLoginError() { document.getElementById('login-error').classList.add('hidden'); }
async function logout() { var c = getSB(); if (c) await c.auth.signOut().catch(function () { }); STATE.currentUser = null; STATE.vehicles = []; STATE.leads = []; STATE.calls = []; STATE.dealerships = []; STATE.users = []; STATE.aiMessages = []; STATE.aiTyping = false; document.getElementById('app').style.display = 'none'; document.getElementById('login-screen').style.display = 'flex'; document.getElementById('login-email').value = ''; document.getElementById('login-pass').value = ''; document.getElementById('login-pass').type = 'password'; document.getElementById('eye-show').style.display = 'block'; document.getElementById('eye-hide').style.display = 'none'; hideLoginError(); resetLoginBtn(); }

/* ── APP INIT ─────────────────────────────────────────────────── */
function initApp() {
  var u = STATE.currentUser, isAdmin = u.role === 'ADMIN';
  document.getElementById('user-avatar').textContent = (u.name || u.email).slice(0, 2).toUpperCase();
  document.getElementById('user-email-display').textContent = u.email;
  document.getElementById('user-role-display').textContent = u.role;
  document.getElementById('admin-pill').classList[isAdmin ? 'remove' : 'add']('hidden');
  var navItems = isAdmin ? ADMIN_NAV : CLIENT_NAV, lastSection = '', navHtml = '';
  navItems.forEach(function (n) {
    if (isAdmin && n.section && n.section !== lastSection) { if (n.section) navHtml += '<div class="nav-section-label">' + escH(n.section) + '</div>'; lastSection = n.section; }
    navHtml += '<div class="nav-link" onclick="navigate(\'' + escQ(n.id) + '\')" id="nav-' + escQ(n.id) + '" tabindex="0" role="button">' + icon(n.icon, 15) + '<span>' + escH(n.label) + '</span><span class="nav-chevron">' + icon('chevron', 12) + '</span></div>';
  });
  document.getElementById('sidebar-nav').innerHTML = navHtml;
  if (isAdmin) {
    listenToDealerships(); listenToUsers(); listenToVehicles(null); listenToLeads(null); listenToCalls(null);
  } else {
    if (u.dealershipId) {
      listenToVehicles(u.dealershipId); listenToLeads(u.dealershipId); listenToCalls(u.dealershipId);
    } else {
      console.warn('Orphaned client account - blocking data fetch.');
      STATE.vehicles = []; STATE.leads = []; STATE.calls = [];
    }
  }
  navigate(isAdmin ? 'admin' : 'dashboard');
}
function toggleSidebar() { var s = document.getElementById('sidebar'), o = document.getElementById('sidebar-overlay'); s.classList.toggle('open'); o.classList[s.classList.contains('open') ? 'add' : 'remove']('show'); }
function animateBars() { document.querySelectorAll('.progress-fill[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; }); }

/* ── LIVE DATA LISTENERS ──────────────────────────────────────── */
async function listenToDealerships() { var c = getSB(); if (!c) return; var doFetch = async function () { var r = await c.from('dealerships').select('*').order('created_at', { ascending: false }); if (r.data) { STATE.dealerships = r.data.map(nd); var cp = STATE.currentPage; if (cp === 'dealerships') rerenderPage('dealerships'); if (cp === 'admin') rerenderPage('admin'); if (cp === 'analytics') rerenderPage('analytics'); } }; await doFetch(); c.channel('ch-deal').on('postgres_changes', { event: '*', schema: 'public', table: 'dealerships' }, doFetch).subscribe(); }
async function listenToUsers() { var c = getSB(); if (!c) return; var doFetch = async function () { var r = await c.from('users').select('*').order('created_at', { ascending: false }); if (r.data) { STATE.users = r.data.map(nu); if (STATE.currentPage === 'all-users') rerenderPage('all-users'); } }; await doFetch(); c.channel('ch-users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, doFetch).subscribe(); }
async function listenToVehicles(did) { var c = getSB(); if (!c) return; var doFetch = async function () { var q = c.from('vehicles').select('*').order('created_at', { ascending: false }); if (did) q = q.eq('dealership_id', did); var r = await q; if (r.data) { STATE.vehicles = r.data.map(nv); var cp = STATE.currentPage; if (['cars', 'all-vehicles', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp); } }; await doFetch(); c.channel('ch-veh').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, doFetch).subscribe(); }
async function listenToLeads(did) { var c = getSB(); if (!c) return; var doFetch = async function () { var q = c.from('leads').select('*').order('created_at', { ascending: false }); if (did) q = q.eq('dealership_id', did); var r = await q; if (r.data) { STATE.leads = r.data.map(nl); var cp = STATE.currentPage; if (['leads', 'all-leads', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp); } }; await doFetch(); c.channel('ch-lead').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, doFetch).subscribe(); }
async function listenToCalls(did) { var c = getSB(); if (!c) return; var doFetch = async function () { var q = c.from('calls').select('*').order('call_at', { ascending: false }); if (did) q = q.eq('dealership_id', did); var r = await q; if (r.data) { STATE.calls = r.data.map(nc); var cp = STATE.currentPage; if (['calls', 'all-calls', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp); } }; await doFetch(); c.channel('ch-call').on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, doFetch).subscribe(); }

/* ── NAVIGATION ───────────────────────────────────────────────── */
var _renders = { dashboard: renderDashboard, cars: renderCars, leads: renderLeads, calls: renderCalls, admin: renderAdminOverview, dealerships: renderDealerships, analytics: renderAnalytics, recharge: renderRecharge, 'dealer-detail': renderDealerDetail, 'ai-assistant': renderAIAssistant, 'all-vehicles': renderAllVehicles, 'all-leads': renderAllLeads, 'all-calls': renderAllCalls, 'all-users': renderAllUsers };

function navigate(pageId) {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
  document.querySelectorAll('.nav-link').forEach(function (el) { el.classList.remove('active'); });
  var lnk = document.getElementById('nav-' + pageId); if (lnk) { lnk.classList.add('active'); }
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  STATE.currentPage = pageId; STATE.expandedRow = null;
  var page = document.getElementById('page-' + pageId); if (!page) return;
  if (_renders[pageId]) {
    var result = _renders[pageId]();
    // NEW: Check if the function is async (returns a promise)
    if (result instanceof Promise) {
      result.then(function (html) {
        if (html) page.innerHTML = html;
        setTimeout(animateBars, 50);
      });
    } else {
      // Normal synchronous pages
      page.innerHTML = result;
      setTimeout(animateBars, 50);
    }
    page.classList.add('active');
  } setTimeout(animateBars, 50);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function rerenderPage(pageId) {
  var p = document.getElementById('page-' + pageId);
  if (p && p.classList.contains('active') && _renders[pageId]) {
    p.innerHTML = _renders[pageId]();
    setTimeout(animateBars, 50);
  }
}
/* ══════════════════════════════════════════════════════════════
   CLIENT PAGES
   ══════════════════════════════════════════════════════════════ */
function mkStatCard(ic, lbl, val, sub, accent, onclick, hint) { return '<div class="stat-card' + (accent ? ' accent' : '') + ' clickable" onclick="' + onclick + '" tabindex="0" role="button" aria-label="' + escH(lbl) + '">' + '<div class="stat-icon ' + (accent ? 'stat-icon-accent' : 'stat-icon-default') + '" style="color:' + (accent ? 'var(--amber)' : 'var(--text-2)') + '">' + icon(ic, 16) + '</div>' + '<div><div class="stat-value">' + val + '</div><div class="stat-label">' + escH(lbl) + '</div>' + (sub ? '<div class="stat-sub">' + escH(sub) + '</div>' : '') + '</div>' + (hint ? '<div class="stat-click-hint">' + icon('arrowup', 9) + ' ' + escH(hint) + '</div>' : '') + '</div>'; }

/* ── BILLING ENGINE ───────────────────────────────────────────── */
function getDealerStats(d, cList) {
  var start = new Date(d.cycle_start_date || d.created_at);
  var end = new Date(start.getTime() + (30 * 24 * 60 * 60 * 1000));
  var now = new Date();
  var daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  var cycleCalls = cList.filter(function (c) { return new Date(c.call_at) >= start; });
  var usedSec = cycleCalls.reduce(function (s, c) { return s + (c.duration || 0); }, 0);
  var usedMin = usedSec / 60;
  var limit = d.minute_limit || Infinity;

  return { usedMin: usedMin, limit: limit, daysLeft: daysLeft, isExpired: (daysLeft <= 0 || usedMin >= limit) };
}

async function autoSuspendCheck(d, stats) {
  if (stats.isExpired && d.isActive) {
    var sb = getSB(); if (!sb) return;
    var r = await fetch(SUPA_URL + '/functions/v1/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await sb.auth.getSession()).data.session.access_token },
      body: JSON.stringify({ action: 'autoSuspendCheck', dealershipId: d.id })
    });
    var res = await r.json();
    if (res.suspended) {
      d.isActive = false; d.is_active = false; d.status = 'suspended'; // Optimistic block
      showToast('System Auto-Suspended ' + d.name + ' due to limit reach.', 'error');
    }
  }
}

/* ── CLIENT: DASHBOARD ────────────────────────────────────────── */
function renderDashboard() {
  var v = STATE.vehicles, l = STATE.leads, c = STATE.calls;
  var avail = v.filter(function (x) { return x.isAvailable; }).length;
  var booked = c.filter(function (x) { return x.outcome === 'BOOKED_VISIT'; }).length;
  var hot = l.filter(function (x) { return x.score === 'HOT'; }).length;
  var totalVal = v.reduce(function (s, x) { return s + (x.price || 0); }, 0);
  var totalDur = c.reduce(function (s, x) { return s + (x.duration || 0); }, 0);
  var outcomes = { BOOKED_VISIT: 0, FOLLOW_UP: 0, NOT_INTERESTED: 0, UNANSWERED: 0 };
  c.forEach(function (x) { outcomes[x.outcome] = (outcomes[x.outcome] || 0) + 1; });
  var outMax = Math.max.apply(null, Object.values(outcomes)) || 1;

  // NEW: Calculate Usage & Trigger Limit Alerts for Client
  var limitAlert = '';
  var myDealer = STATE.dealerships.find(function (x) { return x.id === STATE.currentUser.dealershipId; });
  if (myDealer && myDealer.minute_limit) {
    var stats = getDealerStats(myDealer, c);
    autoSuspendCheck(myDealer, stats); // Auto-deactivates them if they are over limits!
    if (stats.isExpired) {
      limitAlert = '<div class="alert alert-error" style="margin-bottom:20px;font-size:14px">🚨 <b>CRITICAL:</b> Billing limit reached (' + stats.usedMin.toFixed(3) + ' / ' + stats.limit + ' min, ' + stats.daysLeft + ' days left). AI is paused. Contact Admin to recharge.</div>';
    } else if (stats.usedMin >= stats.limit * 0.85 || stats.daysLeft <= 5) {
      limitAlert = '<div class="alert alert-error" style="margin-bottom:20px;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amber);font-size:14px">⚠️ <b>WARNING:</b> Nearing billing limit (' + stats.usedMin.toFixed(3) + ' / ' + stats.limit + ' min, ' + stats.daysLeft + ' days left).</div>';
    }
  }

  return '<div class="page-header"><div class="page-title font-display">Overview</div><div class="page-sub">Your dealership at a glance</div></div>' +
    limitAlert +
    '<div class="stats-grid">' +
    mkStatCard('car', 'Total Vehicles', v.length, avail + ' available', false, "STATE.vehicleFilter='';navigate('cars')", 'View vehicles') +
    mkStatCard('users', 'Total Leads', l.length, hot + ' hot leads', false, "STATE.leadFilter='';navigate('leads')", 'View leads') +
    mkStatCard('flame', 'Hot Leads', hot, '', true, "STATE.leadFilter='HOT';navigate('leads')", 'View hot leads') +
    mkStatCard('phone', 'Total Calls', c.length, booked + ' booked', false, "STATE.callFilter='';navigate('calls')", 'View calls') +
    mkStatCard('check', 'Booked Visits', booked, 'from calls', false, "STATE.callFilter='BOOKED_VISIT';navigate('calls')", 'View booked') +
    '</div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(2,1fr);margin-top:-10px;margin-bottom:28px">' +
    '<div class="stat-card stat-balance clickable" onclick="showMetricDetail(\'balance\')" tabindex="0" role="button">' +
    '<div style="display:flex;align-items:center;justify-content:space-between"><div class="stat-icon stat-icon-emerald">' + icon('wallet', 16) + '</div><div style="font-size:10px;color:var(--emerald);opacity:.7">Click for details →</div></div>' +
    '<div><div class="stat-value" style="font-size:20px;color:var(--emerald)">' + fmt(totalVal) + '</div><div class="stat-label">Total Inventory Balance</div></div></div>' +
    '<div class="stat-card stat-duration clickable" onclick="showMetricDetail(\'duration\')" tabindex="0" role="button">' +
    '<div style="display:flex;align-items:center;justify-content:space-between"><div class="stat-icon stat-icon-sky">' + icon('timer', 16) + '</div><div style="font-size:10px;color:var(--sky);opacity:.7">Click for details →</div></div>' +
    '<div><div class="stat-value" style="font-size:16px;color:var(--sky)">' + fmtDurationFull(totalDur) + '</div><div class="stat-label">Total Call Duration</div></div></div>' +
    '</div>' +
    '<div class="two-col" style="margin-bottom:20px">' +
    '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)"><div class="section-title" style="margin:0">Recent Leads</div><button onclick="navigate(\'leads\')" class="btn btn-ghost btn-sm">View all ' + icon('arrowup', 12) + '</button></div>' +
    (l.length === 0 ? '<div class="empty-state">' + icon('users', 24) + '<br>No leads yet</div>' : l.slice(0, 5).map(function (x) { return '<div class="activity-item"><div><div style="font-size:13.5px;font-weight:500;color:var(--text-1)">' + escH(x.customerName) + '</div><div style="font-size:12px;color:var(--text-3);margin-top:2px">' + escH(x.phoneNumber) + (x.carInterested ? ' · ' + escH(x.carInterested) : '') + '</div></div><div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' + (x.score ? '<span class="badge ' + scoreBadge(x.score) + '">' + x.score + '</span>' : '') + '<span style="font-size:11px;color:var(--text-3)">' + fmtDateShort(x.created_at) + '</span></div></div>'; }).join('')) +
    '</div>' +
    '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)"><div class="section-title" style="margin:0">Recent Calls</div><button onclick="navigate(\'calls\')" class="btn btn-ghost btn-sm">View all ' + icon('arrowup', 12) + '</button></div>' +
    (c.length === 0 ? '<div class="empty-state">' + icon('phone', 24) + '<br>No calls yet</div>' : c.slice(0, 5).map(function (x) { return '<div class="activity-item"><div><div style="font-size:13.5px;font-weight:500;color:var(--text-1)">' + escH(x.callerName || x.callerPhone) + '</div><div style="font-size:12px;color:var(--text-3);margin-top:2px;display:flex;align-items:center;gap:4px">' + icon('clock', 11) + ' ' + fmtDuration(x.duration) + '</div></div><span class="badge ' + outcomeBadge(x.outcome) + '">' + outcomeLabel(x.outcome) + '</span></div>'; }).join('')) +
    '</div>' +
    '</div>' +
    '<div class="two-col">' +
    '<div class="card card-p"><div class="section-title">' + icon('chart', 15) + ' Call Outcomes</div><div class="bar-chart">' +
    Object.entries(outcomes).map(function (e) { var pct = Math.round((e[1] / outMax) * 100); var colors = { BOOKED_VISIT: 'var(--emerald)', FOLLOW_UP: 'var(--amber)', NOT_INTERESTED: 'var(--text-3)', UNANSWERED: 'var(--rose)' }; return '<div class="bar-col"><div class="bar-val">' + e[1] + '</div><div class="bar-fill" style="height:' + (pct || 4) + '%;background:' + colors[e[0]] + ';width:100%;border-radius:4px 4px 0 0"></div><div class="bar-label">' + outcomeLabel(e[0]).replace(' ', '\u00AD') + '</div></div>'; }).join('') +
    '</div></div>' +
    '<div class="card card-p"><div class="section-title">' + icon('trending', 15) + ' Lead Score Breakdown</div>' +
    [['HOT', '#f87171', 'flame'], ['WARM', 'var(--amber)', 'phone'], ['COLD', 'var(--sky)', 'snowflake']].map(function (sc) { var cnt = l.filter(function (x) { return x.score === sc[0]; }).length; var pct = l.length > 0 ? Math.round(cnt / l.length * 100) : 0; return '<div class="progress-row"><div class="progress-info"><span style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-2)">' + icon(sc[2], 12) + ' ' + sc[0] + '</span><span style="font-size:12px;color:var(--text-3)">' + cnt + ' (' + pct + '%)</span></div><div class="progress-bar"><div class="progress-fill" data-w="' + pct + '" style="width:0;background:' + sc[1] + '"></div></div></div>'; }).join('') +
    '</div>' +
    '</div>';
}
/* ── CLIENT: CARS ─────────────────────────────────────────────── */
function renderCars() {
  var filtered = STATE.vehicles.filter(function (v) { var s = STATE.vehicleSearch.toLowerCase(); var ms = !s || (v.make || '').toLowerCase().includes(s) || (v.model || '').toLowerCase().includes(s) || (v.year + '').includes(s); var mf = !STATE.vehicleFilter || (STATE.vehicleFilter === 'available' ? v.isAvailable : !v.isAvailable); return ms && mf; });
  return '<div class="page-header-row"><div><div class="page-title font-display">Car Catalogue</div><div class="page-sub">' + STATE.vehicles.length + ' vehicles in inventory</div></div><button onclick="openVehicleModal()" class="btn btn-primary">' + icon('plus', 15) + ' Add Vehicle</button></div>' +
    '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search make, model or year..." value="' + escH(STATE.vehicleSearch) + '" oninput="STATE.vehicleSearch=this.value;rerenderPage(\'cars\')" maxlength="100"></div>' +
    '<button class="pill-filter' + (STATE.vehicleFilter === '' ? ' active' : '') + '" onclick="STATE.vehicleFilter=\'\';rerenderPage(\'cars\')">All</button>' +
    '<button class="pill-filter' + (STATE.vehicleFilter === 'available' ? ' active' : '') + '" onclick="STATE.vehicleFilter=\'available\';rerenderPage(\'cars\')">Available</button>' +
    '<button class="pill-filter' + (STATE.vehicleFilter === 'sold' ? ' active' : '') + '" onclick="STATE.vehicleFilter=\'sold\';rerenderPage(\'cars\')">Sold</button></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Make &amp; Model</th><th class="table-th">Year</th><th class="table-th">Fuel</th><th class="table-th">Transmission</th><th class="table-th">Mileage</th><th class="table-th">Price</th><th class="table-th">Status</th><th class="table-th">Description</th><th class="table-th"></th>' +
    '</tr></thead><tbody>' +
    (filtered.length === 0 ? '<tr><td colspan="10"><div class="empty-state">' + icon('car', 28) + '<br>No vehicles found</div></td></tr>' :
      filtered.map(function (v, i) {
        return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td>' +
          '<td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(v.make) + ' ' + escH(v.model) + '</span></td>' +
          '<td class="table-td">' + escH(v.year) + '</td>' +
          '<td class="table-td">' + escH(v.fuelType) + '</td>' +
          '<td class="table-td">' + escH((v.transmission || '').replace(/_/g, ' ')) + '</td>' +
          '<td class="table-td">' + (v.mileage || 0).toLocaleString() + ' mi</td>' +
          '<td class="table-td" style="font-weight:600;color:var(--text-1)">' + fmt(v.price) + '</td>' +
          '<td class="table-td"><span class="badge ' + (v.isAvailable ? 'badge-success' : 'badge-neutral') + '">' + (v.isAvailable ? 'Available' : 'Sold') + '</span></td>' +
          '<td class="table-td" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">' + escH((v.description || '').slice(0, 60)) + '</td>' +
          '<td class="table-td"><div style="display:flex;gap:4px">' +
          '<button onclick="openVehicleModal(\'' + escQ(v.id) + '\')" class="btn btn-ghost btn-icon" title="Edit">' + icon('pencil', 14) + '</button>' +
          '<button onclick="promptDelete(\'vehicle\', \'' + escQ(v.id) + '\')" class="btn btn-ghost btn-icon" style="color:var(--text-3)" title="Delete" onmouseover="this.style.color=\'var(--rose)\'" onmouseout="this.style.color=\'var(--text-3)\'">' + icon('trash', 14) + '</button>' +
          '</div></td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}

/* ── CLIENT: LEADS ────────────────────────────────────────────── */
function renderLeads() {
  var filtered = STATE.leads;
  if (STATE.leadFilter) filtered = filtered.filter(function (l) { return l.score === STATE.leadFilter; });
  return '<div class="page-header-row"><div><div class="page-title font-display">Leads</div><div class="page-sub">' + STATE.leads.length + ' total leads</div></div><button onclick="openLeadModal()" class="btn btn-primary">' + icon('plus', 15) + ' Add Lead</button></div>' +
    '<div class="filters-bar">' +
    '<button class="pill-filter' + (!STATE.leadFilter ? ' active' : '') + '" onclick="STATE.leadFilter=\'\';rerenderPage(\'leads\')">All</button>' +
    '<button class="pill-filter' + (STATE.leadFilter === 'HOT' ? ' active' : '') + '" onclick="STATE.leadFilter=\'HOT\';rerenderPage(\'leads\')">🔥 Hot</button>' +
    '<button class="pill-filter' + (STATE.leadFilter === 'WARM' ? ' active' : '') + '" onclick="STATE.leadFilter=\'WARM\';rerenderPage(\'leads\')">WARM</button>' +
    '<button class="pill-filter' + (STATE.leadFilter === 'COLD' ? ' active' : '') + '" onclick="STATE.leadFilter=\'COLD\';rerenderPage(\'leads\')">COLD</button></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Customer Name</th><th class="table-th">Phone Number</th><th class="table-th">Car Interested</th><th class="table-th">Visit Date</th><th class="table-th">Added</th><th class="table-th">Score</th><th class="table-th"></th>' +
    '</tr></thead><tbody>' +
    (filtered.length === 0 ? '<tr><td colspan="8"><div class="empty-state">' + icon('users', 28) + '<br>No leads found</div></td></tr>' :
      filtered.map(function (l, i) {
        return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td>' +
          '<td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(l.customerName) + '</span></td>' +
          '<td class="table-td">' + escH(l.phoneNumber) + '</td>' +
          '<td class="table-td">' + escH(l.carInterested || '–') + '</td>' +
          '<td class="table-td">' + (l.visitDate ? fmtDateShort(l.visitDate) : '–') + '</td>' +
          '<td class="table-td" style="font-size:12px;color:var(--text-3)">' + fmtDateShort(l.created_at) + '</td>' +
          '<td class="table-td">' + (l.score ? '<span class="badge ' + scoreBadge(l.score) + '">' + l.score + '</span>' : '–') + '</td>' +
          '<td class="table-td"><div style="display:flex;gap:4px">' +
          '<button onclick="editLeadModal(\'' + escQ(l.id) + '\')" class="btn btn-ghost btn-icon" title="Edit">' + icon('pencil', 14) + '</button>' +
          '<button onclick="promptDelete(\'lead\', \'' + escQ(l.id) + '\')" class="btn btn-ghost btn-icon" style="color:var(--text-3)" title="Delete" onmouseover="this.style.color=\'var(--rose)\'" onmouseout="this.style.color=\'var(--text-3)\'">' + icon('trash', 14) + '</button>' +
          '</div></td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}

/* ── CLIENT: CALLS ────────────────────────────────────────────── */
function renderCalls() {
  var filtered = STATE.calls;
  if (STATE.callFilter) filtered = filtered.filter(function (c) { return c.outcome === STATE.callFilter; });
  var tDur = filtered.reduce(function (s, c) { return s + (c.duration || 0); }, 0);
  return '<div class="page-header-row"><div><div class="page-title font-display">Call Logs</div><div class="page-sub">' + STATE.calls.length + ' total calls</div></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);border-radius:6px;font-size:12px;color:var(--sky)">' + icon('timer', 12) + ' ' + fmtDurationFull(tDur) + '</span></div></div>' +
    '<div class="filters-bar">' +
    '<button class="pill-filter' + (!STATE.callFilter ? ' active' : '') + '" onclick="STATE.callFilter=\'\';rerenderPage(\'calls\')">All</button>' +
    '<button class="pill-filter' + (STATE.callFilter === 'BOOKED_VISIT' ? ' active' : '') + '" onclick="STATE.callFilter=\'BOOKED_VISIT\';rerenderPage(\'calls\')">Booked</button>' +
    '<button class="pill-filter' + (STATE.callFilter === 'FOLLOW_UP' ? ' active' : '') + '" onclick="STATE.callFilter=\'FOLLOW_UP\';rerenderPage(\'calls\')">Follow-up</button>' +
    '<button class="pill-filter' + (STATE.callFilter === 'UNANSWERED' ? ' active' : '') + '" onclick="STATE.callFilter=\'UNANSWERED\';rerenderPage(\'calls\')">Unanswered</button>' +
    '<button class="pill-filter' + (STATE.callFilter === 'NOT_INTERESTED' ? ' active' : '') + '" onclick="STATE.callFilter=\'NOT_INTERESTED\';rerenderPage(\'calls\')">Not Interested</button></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Date &amp; Time</th><th class="table-th">Caller Name</th><th class="table-th">Caller Phone</th><th class="table-th">Duration</th><th class="table-th">Outcome</th><th class="table-th">Recording</th><th class="table-th">Transcript</th>' +
    '</tr></thead><tbody>' +
    (filtered.length === 0 ? '<tr><td colspan="8"><div class="empty-state">' + icon('phone', 28) + '<br>No calls found</div></td></tr>' :
      filtered.map(function (c, i) {
        return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td>' +
          '<td class="table-td" style="font-size:12px;color:var(--text-3);white-space:nowrap">' + fmtDate(c.call_at) + '</td>' +
          '<td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(c.callerName || '–') + '</span></td>' +
          '<td class="table-td">' + escH(c.callerPhone) + '</td>' +
          '<td class="table-td">' + fmtDuration(c.duration) + '</td>' +
          '<td class="table-td"><span class="badge ' + outcomeBadge(c.outcome) + '">' + outcomeLabel(c.outcome) + '</span></td>' +
          '<td class="table-td">' + (c.recordingUrl ? '<a href="' + escH(c.recordingUrl) + '" target="_blank" rel="noopener noreferrer" class="recording-link">' + icon('play', 12) + ' Play</a>' : '<span style="color:var(--text-3);font-size:12px">None</span>') + '</td>' +
          '<td class="table-td">' + (c.transcript ? '<button onclick="showTranscript(\'' + escQ(c.id) + '\')" class="btn btn-ghost btn-sm" style="font-size:11px">' + icon('eye', 12) + ' View</button>' : '<span style="color:var(--text-3);font-size:12px">None</span>') + '</td>' +
          '</tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}
function showTranscript(id) { var c = STATE.calls.find(function (x) { return String(x.id) === String(id); }); if (!c) return; document.getElementById('modal-container').innerHTML = '<div class="modal-bg" onclick="closeModal(event)"><div class="modal-card"><div class="modal-title font-display">Call Transcript</div><button class="modal-close" onclick="closeModalDirect()">' + icon('x', 16) + '</button><div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap"><span style="font-size:13px;color:var(--text-2)">' + escH(c.callerName || c.callerPhone) + '</span><span class="badge ' + outcomeBadge(c.outcome) + '">' + outcomeLabel(c.outcome) + '</span><span style="font-size:12px;color:var(--text-3)">' + fmtDate(c.call_at) + ' · ' + fmtDuration(c.duration) + '</span></div><div class="transcript-box">' + escH(c.transcript) + '</div>' + (c.recordingUrl ? '<div style="margin-top:12px"><a href="' + escH(c.recordingUrl) + '" target="_blank" rel="noopener noreferrer" class="recording-link">' + icon('play', 14) + ' Play Recording</a></div>' : '') + '<div class="modal-footer"><button onclick="closeModalDirect()" class="btn btn-secondary">Close</button></div></div></div>'; }
/* ══════════════════════════════════════════════════════════════
   ADMIN PAGES
   ══════════════════════════════════════════════════════════════ */
function mkAdminStatCard(ic, lbl, val, sub, navTo, hint) { return '<div class="stat-card clickable" onclick="navigate(\'' + escQ(navTo) + '\')" tabindex="0" role="button"><div class="stat-icon stat-icon-default" style="color:var(--text-2)">' + icon(ic, 16) + '</div><div><div class="stat-value">' + val + '</div><div class="stat-label">' + escH(lbl) + '</div>' + (sub ? '<div class="stat-sub">' + escH(sub) + '</div>' : '') + '</div>' + (hint ? '<div class="stat-click-hint">' + icon('arrowup', 9) + ' ' + escH(hint) + '</div>' : '') + '</div>'; }
function miniStat(val, label, color) { return '<div style="background:var(--bg-900);border:1px solid var(--border-sub);border-radius:10px;padding:12px;text-align:center"><div style="font-size:16px;font-weight:700;font-family:\'Syne\',sans-serif;color:' + (color || 'var(--text-1)') + '">' + val + '</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">' + label + '</div></div>'; }

/* ── ADMIN: OVERVIEW ──────────────────────────────────────────── */
function renderAdminOverview() {
  var d = STATE.dealerships, v = STATE.vehicles, l = STATE.leads, c = STATE.calls;
  var activeDealers = d.filter(function (x) { return x.isActive; }).length;
  var hotLeads = l.filter(function (x) { return x.score === 'HOT'; }).length;
  var booked = c.filter(function (x) { return x.outcome === 'BOOKED_VISIT'; }).length;
  var availVehicles = v.filter(function (x) { return x.isAvailable; }).length;
  var totalBalance = v.reduce(function (s, x) { return s + (x.price || 0); }, 0);
  var totalCost = c.reduce(function (s, x) { return s + (x.cost || 0); }, 0);
  var totalDur = c.reduce(function (s, x) { return s + (x.duration || 0); }, 0);
  var costPerCall = c.length > 0 ? totalCost / c.length : 0;
  var outcomes = { BOOKED_VISIT: 0, FOLLOW_UP: 0, NOT_INTERESTED: 0, UNANSWERED: 0 };
  c.forEach(function (x) { outcomes[x.outcome] = (outcomes[x.outcome] || 0) + 1; });
  var outMax = Math.max.apply(null, Object.values(outcomes)) || 1;

  // NEW: Calculate Usage & Trigger Limit Alerts for Admin
  var limitAlerts = '';
  d.forEach(function (dealer) {
    if (!dealer.minute_limit) return;
    var dCalls = c.filter(function (x) { return x.dealershipId === dealer.id; });
    var stats = getDealerStats(dealer, dCalls);
    autoSuspendCheck(dealer, stats); // Auto-deactivates them instantly if you view the dashboard
    if (stats.isExpired) {
      limitAlerts += '<div class="alert alert-error" style="margin-bottom:10px">🚨 <b>' + escH(dealer.name) + '</b> reached limits (' + stats.usedMin.toFixed(3) + ' / ' + stats.limit + ' min, ' + stats.daysLeft + ' days left). SUSPENDED.</div>';
    } else if (stats.usedMin >= stats.limit * 0.85 || stats.daysLeft <= 5) {
      limitAlerts += '<div class="alert alert-error" style="margin-bottom:10px;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:var(--amber)">⚠️ <b>' + escH(dealer.name) + '</b> nearing limits (' + stats.usedMin.toFixed(3) + ' / ' + stats.limit + ' min, ' + stats.daysLeft + ' days left).</div>';
    }
  });

  return '<div class="page-header"><div class="admin-badge-pill">' + icon('zap', 10) + ' ADMIN CONSOLE</div><div class="page-title font-display">Platform Overview</div><div class="page-sub">All dealerships · All data · Live</div></div>' +
    (limitAlerts ? '<div style="margin-bottom:24px">' + limitAlerts + '</div>' : '') +
    '<div class="stats-grid" style="margin-bottom:16px">' +
    mkAdminStatCard('building', 'Dealerships', d.length, activeDealers + ' active', 'dealerships', 'View dealerships') +
    mkAdminStatCard('users', 'All Leads', l.length, hotLeads + ' hot', 'all-leads', 'View all leads') +
    mkAdminStatCard('phone', 'All Calls', c.length, booked + ' booked', 'all-calls', 'View all calls') +
    mkAdminStatCard('car', 'All Vehicles', v.length, availVehicles + ' available', 'all-vehicles', 'View all vehicles') +
    mkAdminStatCard('shield', 'All Users', STATE.users.length, '', 'all-users', 'View all users') +
    '</div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:28px">' +
    '<div class="stat-card stat-balance clickable" onclick="showMetricDetail(\'balance\')" tabindex="0" role="button"><div style="display:flex;align-items:center;justify-content:space-between"><div class="stat-icon stat-icon-emerald">' + icon('wallet', 16) + '</div><div style="font-size:10px;color:var(--emerald);opacity:.7">Click for breakdown →</div></div><div><div class="stat-value" style="font-size:18px;color:var(--emerald)">' + fmt(totalBalance) + '</div><div class="stat-label">Total Inventory Balance</div><div class="stat-sub">' + v.length + ' vehicles across all dealerships</div></div></div>' +
    '<div class="stat-card stat-cost clickable" onclick="showMetricDetail(\'cost\')" tabindex="0" role="button"><div style="display:flex;align-items:center;justify-content:space-between"><div class="stat-icon stat-icon-rose">' + icon('receipt', 16) + '</div><div style="font-size:10px;color:var(--rose);opacity:.7">Click for breakdown →</div></div><div><div class="stat-value" style="font-size:18px;color:var(--rose)">' + fmtCost(totalCost) + '</div><div class="stat-label">Total Calls Cost</div><div class="stat-sub">Avg ' + fmtCost(costPerCall) + ' per call</div></div></div>' +
    '<div class="stat-card stat-duration clickable" onclick="showMetricDetail(\'duration\')" tabindex="0" role="button"><div style="display:flex;align-items:center;justify-content:space-between"><div class="stat-icon stat-icon-sky">' + icon('timer', 16) + '</div><div style="font-size:10px;color:var(--sky);opacity:.7">Click for breakdown →</div></div><div><div class="stat-value" style="font-size:15px;color:var(--sky)">' + fmtDurationFull(totalDur) + '</div><div class="stat-label">Total Call Duration</div><div class="stat-sub">' + c.length + ' calls total</div></div></div>' +
    '</div>' +
    '<div class="two-col" style="margin-bottom:20px">' +
    '<div class="card card-p"><div class="section-title">' + icon('chart', 15) + ' Call Outcomes</div><div class="bar-chart">' +
    Object.entries(outcomes).map(function (e) { var pct = Math.round((e[1] / outMax) * 100); var colors = { BOOKED_VISIT: 'var(--emerald)', FOLLOW_UP: 'var(--amber)', NOT_INTERESTED: 'var(--text-3)', UNANSWERED: 'var(--rose)' }; return '<div class="bar-col"><div class="bar-val">' + e[1] + '</div><div class="bar-fill" style="height:' + (pct || 4) + '%;background:' + colors[e[0]] + ';width:100%;border-radius:4px 4px 0 0"></div><div class="bar-label">' + outcomeLabel(e[0]).replace(' ', '\u00AD') + '</div></div>'; }).join('') +
    '</div></div>' +
    '<div class="card card-p"><div class="section-title">' + icon('star', 15) + ' Top Dealerships</div>' +
    ([...d].sort(function (a, b) { return ((b.calls || 0) + (b.leads || 0)) - ((a.calls || 0) + (a.leads || 0)); }).slice(0, 5).map(function (x, i) { var medals = ['🥇', '🥈', '🥉']; return '<div class="activity-item" style="cursor:pointer;padding:10px 0;border-bottom:' + (i < 4 ? '1px solid var(--border-sub)' : 'none') + '" onclick="openDealerDetail(\'' + escQ(x.id) + '\')"><div style="display:flex;align-items:center;gap:10px;flex:1"><div style="font-size:15px;width:22px">' + (medals[i] || '<span style="font-size:12px;color:var(--text-3);font-weight:600">' + (i + 1) + '</span>') + '</div><div><div style="font-size:13px;font-weight:500;color:var(--text-1)">' + escH(x.name) + '</div><div style="font-size:11px;color:var(--text-3)">' + (x.calls || 0) + ' calls · ' + (x.leads || 0) + ' leads</div></div></div><span class="badge ' + planBadge(x.plan) + '">' + x.plan + '</span></div>'; }).join('')) || '<div class="empty-state" style="padding:20px">No dealerships yet</div>' +
    '</div>' +
    '</div>' +
    '<div class="two-col">' +
    '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)"><div class="section-title" style="margin:0">Recent Calls</div><button onclick="navigate(\'all-calls\')" class="btn btn-ghost btn-sm">View all ' + icon('arrowup', 12) + '</button></div>' +
    (c.length === 0 ? '<div class="empty-state" style="padding:24px">No calls yet</div>' : c.slice(0, 5).map(function (x) { var dealer = d.find(function (dd) { return dd.id === x.dealershipId; }); return '<div class="activity-item"><div><div style="font-size:13px;font-weight:500;color:var(--text-1)">' + escH(x.callerName || x.callerPhone) + '</div><div style="font-size:11px;color:var(--text-3)">' + (dealer ? escH(dealer.name) : '–') + ' · ' + fmtDuration(x.duration) + ' · ' + fmtCost(x.cost) + '</div></div><span class="badge ' + outcomeBadge(x.outcome) + '">' + outcomeLabel(x.outcome) + '</span></div>'; }).join('')) +
    '</div>' +
    '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)"><div class="section-title" style="margin:0">Recent Leads</div><button onclick="navigate(\'all-leads\')" class="btn btn-ghost btn-sm">View all ' + icon('arrowup', 12) + '</button></div>' +
    (l.length === 0 ? '<div class="empty-state" style="padding:24px">No leads yet</div>' : l.slice(0, 5).map(function (x) { var dealer = d.find(function (dd) { return dd.id === x.dealershipId; }); return '<div class="activity-item"><div><div style="font-size:13px;font-weight:500;color:var(--text-1)">' + escH(x.customerName) + '</div><div style="font-size:11px;color:var(--text-3)">' + (dealer ? escH(dealer.name) : '–') + ' · ' + escH(x.phoneNumber) + '</div></div>' + (x.score ? '<span class="badge ' + scoreBadge(x.score) + '">' + x.score + '</span>' : '') + ' </div>'; }).join('')) +
    '</div>' +
    '</div>';
}

/* ── ADMIN: ALL VEHICLES ──────────────────────────────────────── */
function renderAllVehicles() {
  var d = STATE.dealerships, s = (STATE.adminVSearch || '').toLowerCase(), fD = STATE.adminVDealer || '';
  var v = STATE.vehicles.filter(function (x) {
    var ms = !s || (x.make || '').toLowerCase().includes(s) || (x.model || '').toLowerCase().includes(s) || (x.year + '').includes(s);
    var md = !fD || x.dealershipId === fD;
    return ms && md;
  });
  var dOpts = '<option value="">All Dealerships</option>' + d.map(function (dd) { return '<option value="' + escH(dd.id) + '" ' + (fD === dd.id ? 'selected' : '') + '>' + escH(dd.name) + '</option>'; }).join('');
  return '<div class="page-header-row"><div><div class="admin-badge-pill">' + icon('zap', 10) + ' ADMIN</div><div class="page-title font-display">All Vehicles</div><div class="page-sub">' + v.length + ' vehicles found</div></div><button onclick="openVehicleModal()" class="btn btn-primary">' + icon('plus', 15) + ' Add Vehicle</button></div>' +
    '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search make, model, year..." value="' + escH(STATE.adminVSearch) + '" oninput="STATE.adminVSearch=this.value;rerenderPage(\'all-vehicles\')" maxlength="100"></div>' +
    '<select class="input" style="width:auto;min-width:180px" onchange="STATE.adminVDealer=this.value;rerenderPage(\'all-vehicles\')">' + dOpts + '</select></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Dealership</th><th class="table-th">Make &amp; Model</th><th class="table-th">Year</th><th class="table-th">Fuel</th><th class="table-th">Transmission</th><th class="table-th">Mileage</th><th class="table-th">Price</th><th class="table-th">Status</th><th class="table-th"></th>' +
    '</tr></thead><tbody>' +
    (v.length === 0 ? '<tr><td colspan="10"><div class="empty-state">' + icon('car', 28) + '<br>No vehicles found</div></td></tr>' :
      v.map(function (vv, i) {
        var dealer = d.find(function (x) { return x.id === vv.dealershipId; }); return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td><td class="table-td" style="font-size:12px;color:var(--text-3)">' + escH(dealer ? dealer.name : '–') + '</td>' +
          '<td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(vv.make) + ' ' + escH(vv.model) + '</span></td><td class="table-td">' + escH(vv.year) + '</td>' +
          '<td class="table-td">' + escH(vv.fuelType) + '</td><td class="table-td">' + escH((vv.transmission || '').replace(/_/g, ' ')) + '</td><td class="table-td">' + (vv.mileage || 0).toLocaleString() + ' mi</td>' +
          '<td class="table-td" style="font-weight:600;color:var(--text-1)">' + fmt(vv.price) + '</td><td class="table-td"><span class="badge ' + (vv.isAvailable ? 'badge-success' : 'badge-neutral') + '">' + (vv.isAvailable ? 'Available' : 'Sold') + '</span></td>' +
          '<td class="table-td"><div style="display:flex;gap:4px"><button onclick="openVehicleModal(\'' + escQ(vv.id) + '\')" class="btn btn-ghost btn-icon">' + icon('pencil', 14) + '</button><button onclick="promptDelete(\'vehicle\', \'' + escQ(vv.id) + '\')" class="btn btn-ghost btn-icon" style="color:var(--text-3)">' + icon('trash', 14) + '</button></div></td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}

/* ── ADMIN: ALL LEADS ─────────────────────────────────────────── */
function renderAllLeads() {
  var d = STATE.dealerships, s = (STATE.adminLSearch || '').toLowerCase(), fD = STATE.adminLDealer || '', fS = STATE.adminLScore || '';
  var l = STATE.leads.filter(function (x) {
    var ms = !s || (x.customerName || '').toLowerCase().includes(s) || (x.phoneNumber || '').toLowerCase().includes(s);
    var md = !fD || x.dealershipId === fD;
    var mSc = !fS || x.score === fS;
    return ms && md && mSc;
  });
  var dOpts = '<option value="">All Dealerships</option>' + d.map(function (dd) { return '<option value="' + escH(dd.id) + '" ' + (fD === dd.id ? 'selected' : '') + '>' + escH(dd.name) + '</option>'; }).join('');
  return '<div class="page-header-row"><div><div class="admin-badge-pill">' + icon('zap', 10) + ' ADMIN</div><div class="page-title font-display">All Leads</div><div class="page-sub">' + l.length + ' leads found</div></div><button onclick="openLeadModal()" class="btn btn-primary">' + icon('plus', 15) + ' Add Lead</button></div>' +
    '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search name or phone..." value="' + escH(STATE.adminLSearch) + '" oninput="STATE.adminLSearch=this.value;rerenderPage(\'all-leads\')" maxlength="100"></div>' +
    '<select class="input" style="width:auto;min-width:160px" onchange="STATE.adminLDealer=this.value;rerenderPage(\'all-leads\')">' + dOpts + '</select>' +
    '<select class="input" style="width:auto;min-width:140px" onchange="STATE.adminLScore=this.value;rerenderPage(\'all-leads\')"><option value="">All Scores</option><option value="HOT" ' + (fS === 'HOT' ? 'selected' : '') + '>HOT</option><option value="WARM" ' + (fS === 'WARM' ? 'selected' : '') + '>WARM</option><option value="COLD" ' + (fS === 'COLD' ? 'selected' : '') + '>COLD</option></select></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Dealership</th><th class="table-th">Customer Name</th><th class="table-th">Phone Number</th><th class="table-th">Car Interested</th><th class="table-th">Score</th><th class="table-th">Added</th>' +
    '</tr></thead><tbody>' +
    (l.length === 0 ? '<tr><td colspan="7"><div class="empty-state">' + icon('users', 28) + '<br>No leads found</div></td></tr>' :
      l.map(function (ll, i) {
        var dealer = d.find(function (x) { return x.id === ll.dealershipId; }); return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td><td class="table-td" style="font-size:12px;color:var(--text-3)">' + escH(dealer ? dealer.name : '–') + '</td>' +
          '<td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(ll.customerName) + '</span></td><td class="table-td">' + escH(ll.phoneNumber) + '</td>' +
          '<td class="table-td">' + escH(ll.carInterested || '–') + '</td><td class="table-td">' + (ll.score ? '<span class="badge ' + scoreBadge(ll.score) + '">' + ll.score + '</span>' : '–') + '</td>' +
          '<td class="table-td" style="font-size:11px;color:var(--text-3)">' + fmtDateShort(ll.created_at) + '</td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}

/* ── ADMIN: ALL CALLS ─────────────────────────────────────────── */
function renderAllCalls() {
  var d = STATE.dealerships, s = (STATE.adminCSearch || '').toLowerCase(), fD = STATE.adminCDealer || '', fO = STATE.adminCOut || '';
  var c = STATE.calls.filter(function (x) {
    var ms = !s || (x.callerName || '').toLowerCase().includes(s) || (x.callerPhone || '').toLowerCase().includes(s);
    var md = !fD || x.dealershipId === fD;
    var mo = !fO || x.outcome === fO;
    return ms && md && mo;
  });
  var tCost = c.reduce(function (sum, x) { return sum + (x.cost || 0); }, 0), tDur = c.reduce(function (sum, x) { return sum + (x.duration || 0); }, 0);
  var dOpts = '<option value="">All Dealerships</option>' + d.map(function (dd) { return '<option value="' + escH(dd.id) + '" ' + (fD === dd.id ? 'selected' : '') + '>' + escH(dd.name) + '</option>'; }).join('');
  return '<div class="page-header-row"><div><div class="admin-badge-pill">' + icon('zap', 10) + ' ADMIN</div><div class="page-title font-display">All Calls</div><div class="page-sub">' + c.length + ' calls found</div></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="cost-badge">' + icon('receipt', 12) + ' Total: ' + fmtCost(tCost) + '</span><span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);border-radius:6px;font-size:12px;color:var(--sky)">' + icon('timer', 12) + ' ' + fmtDurationFull(tDur) + '</span></div></div>' +
    '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search caller..." value="' + escH(STATE.adminCSearch) + '" oninput="STATE.adminCSearch=this.value;rerenderPage(\'all-calls\')" maxlength="100"></div>' +
    '<select class="input" style="width:auto;min-width:160px" onchange="STATE.adminCDealer=this.value;rerenderPage(\'all-calls\')">' + dOpts + '</select>' +
    '<select class="input" style="width:auto;min-width:140px" onchange="STATE.adminCOut=this.value;rerenderPage(\'all-calls\')"><option value="">All Outcomes</option><option value="BOOKED_VISIT" ' + (fO === 'BOOKED_VISIT' ? 'selected' : '') + '>Booked Visit</option><option value="FOLLOW_UP" ' + (fO === 'FOLLOW_UP' ? 'selected' : '') + '>Follow Up</option><option value="UNANSWERED" ' + (fO === 'UNANSWERED' ? 'selected' : '') + '>Unanswered</option></select></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Dealership</th><th class="table-th">Call Time</th><th class="table-th">Caller Name</th><th class="table-th">Duration</th><th class="table-th">Outcome</th><th class="table-th">Cost</th><th class="table-th">Transcript</th>' +
    '</tr></thead><tbody>' +
    (c.length === 0 ? '<tr><td colspan="8"><div class="empty-state">' + icon('phone', 28) + '<br>No calls found</div></td></tr>' :
      c.map(function (cc, i) {
        var dealer = d.find(function (x) { return x.id === cc.dealershipId; }); return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td><td class="table-td" style="font-size:12px;color:var(--text-3)">' + escH(dealer ? dealer.name : '–') + '</td>' +
          '<td class="table-td" style="font-size:12px;white-space:nowrap">' + fmtDate(cc.call_at) + '</td><td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(cc.callerName || cc.callerPhone) + '</span></td>' +
          '<td class="table-td">' + fmtDuration(cc.duration) + '</td><td class="table-td"><span class="badge ' + outcomeBadge(cc.outcome) + '">' + outcomeLabel(cc.outcome) + '</span></td>' +
          '<td class="table-td"><span class="cost-badge">' + fmtCost(cc.cost) + '</span></td>' +
          '<td class="table-td">' + (cc.transcript ? '<button onclick="showTranscript(\'' + escQ(cc.id) + '\')" class="btn btn-ghost btn-sm" style="font-size:11px">' + icon('eye', 12) + ' View</button>' : '<span style="color:var(--text-3);font-size:12px">None</span>') + '</td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}

/* ── ADMIN: ALL USERS ─────────────────────────────────────────── */
function renderAllUsers() {
  var d = STATE.dealerships, s = (STATE.adminUSearch || '').toLowerCase(), fD = STATE.adminUDealer || '';
  var u = STATE.users.filter(function (x) {
    var ms = !s || (x.name || '').toLowerCase().includes(s) || (x.email || '').toLowerCase().includes(s);
    var md = !fD || x.dealershipId === fD;
    return ms && md;
  });
  var dOpts = '<option value="">All Dealerships</option>' + d.map(function (dd) { return '<option value="' + escH(dd.id) + '" ' + (fD === dd.id ? 'selected' : '') + '>' + escH(dd.name) + '</option>'; }).join('');
  return '<div class="page-header-row"><div><div class="admin-badge-pill">' + icon('zap', 10) + ' ADMIN</div><div class="page-title font-display">All Users</div><div class="page-sub">' + u.length + ' users found</div></div><button onclick="openUserModal()" class="btn btn-primary">' + icon('user_plus', 15) + ' Add User</button></div>' +
    '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search name or email..." value="' + escH(STATE.adminUSearch) + '" oninput="STATE.adminUSearch=this.value;rerenderPage(\'all-users\')" maxlength="100"></div>' +
    '<select class="input" style="width:auto;min-width:160px" onchange="STATE.adminUDealer=this.value;rerenderPage(\'all-users\')">' + dOpts + '</select></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Name</th><th class="table-th">Email</th><th class="table-th">Role</th><th class="table-th">Dealership</th><th class="table-th">Created</th><th class="table-th">Actions</th>' +
    '</tr></thead><tbody>' +
    (u.length === 0 ? '<tr><td colspan="7"><div class="empty-state">' + icon('shield', 28) + '<br>No users found</div></td></tr>' :
      u.map(function (uu, i) {
        var dealer = d.find(function (x) { return x.id === uu.dealershipId; }); return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td><td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(uu.name) + '</span></td><td class="table-td" style="color:var(--text-3)">' + escH(uu.email) + '</td>' +
          '<td class="table-td"><span class="badge ' + roleBadge(uu.role) + '">' + escH(uu.role) + '</span></td><td class="table-td" style="font-size:12px;color:var(--text-3)">' + escH(dealer ? dealer.name : '–') + '</td>' +
          '<td class="table-td" style="font-size:11px;color:var(--text-3)">' + fmtDateShort(uu.created_at) + '</td>' +
          '<td class="table-td" style="display:flex;gap:6px">' + (STATE.currentUser && STATE.currentUser.id === uu.id ? '<span style="color:var(--text-3);font-size:12px">Current User</span>' : '<button onclick="openUserModal(\'' + escQ(uu.id) + '\')" class="btn btn-ghost btn-sm" style="color:var(--text-2)">' + icon('pencil', 14) + '</button><button onclick="promptDelete(\'user\', \'' + escQ(uu.id) + '\')" class="btn btn-ghost btn-sm" style="color:var(--danger)">' + icon('trash', 14) + '</button>') + '</td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}
/* ── ADMIN: DEALERSHIPS TABLE ─────────────────────────────────── */
function renderDealerships() {
  var s = (STATE.dSearch || '').toLowerCase(), fS = STATE.dStat || '', fP = STATE.dPlan || '';
  var d = STATE.dealerships.filter(function (dd) {
    var ms = !s || (dd.name || '').toLowerCase().includes(s) || (dd.id || '').toLowerCase().includes(s) || (dd.email || '').toLowerCase().includes(s);
    var mSt = !fS || (fS === 'active' ? dd.isActive : !dd.isActive);
    var mPl = !fP || dd.plan === fP;
    return ms && mSt && mPl;
  });

  return '<div class="page-header-row"><div><div class="page-title font-display">Dealerships</div><div class="page-sub">' + d.length + ' registered accounts</div></div><button onclick="openDealershipModal()" class="btn btn-primary">' + icon('plus', 15) + ' Create Dealership</button></div>' +
    '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search by name, email, or ID..." value="' + escH(STATE.dSearch) + '" oninput="STATE.dSearch=this.value;rerenderPage(\'dealerships\')" maxlength="100"></div>' +
    '<select class="input" style="width:auto;min-width:140px" onchange="STATE.dStat=this.value;rerenderPage(\'dealerships\')"><option value="">All Status</option><option value="active" ' + (fS === 'active' ? 'selected' : '') + '>Active</option><option value="suspended" ' + (fS === 'suspended' ? 'selected' : '') + '>Suspended</option></select>' +
    '<select class="input" style="width:auto;min-width:140px" onchange="STATE.dPlan=this.value;rerenderPage(\'dealerships\')"><option value="">All Plans</option><option value="starter" ' + (fP === 'starter' ? 'selected' : '') + '>Starter</option><option value="pro" ' + (fP === 'pro' ? 'selected' : '') + '>Pro</option><option value="enterprise" ' + (fP === 'enterprise' ? 'selected' : '') + '>Enterprise</option></select></div>' +
    '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr>' +
    '<th class="table-th table-th-num">#</th><th class="table-th">Dealership</th><th class="table-th">Status</th><th class="table-th">Vehicles</th><th class="table-th">Inv Value</th><th class="table-th">Leads</th><th class="table-th">Calls</th><th class="table-th">Call Cost</th><th class="table-th">Call Duration</th><th class="table-th">Actions</th>' +
    '</tr></thead><tbody>' +
    (d.length === 0 ? '<tr><td colspan="10"><div class="empty-state">' + icon('building', 28) + '<br>No dealerships found</div></td></tr>' :
      d.map(function (dd, i) {
        // Admin specific stats calculations
        var dV = STATE.vehicles.filter(function (v) { return v.dealershipId === dd.id; });
        var dC = STATE.calls.filter(function (c) { return c.dealershipId === dd.id; });
        var invVal = dV.reduce(function (sum, v) { return sum + (v.price || 0); }, 0);
        var callCost = dC.reduce(function (sum, c) { return sum + (c.cost || 0); }, 0);
        var callDur = dC.reduce(function (sum, c) { return sum + (c.duration || 0); }, 0);

        return '<tr>' +
          '<td class="table-td-num">' + (i + 1) + '</td>' +
          '<td class="table-td"><div style="color:var(--text-1);font-weight:500;cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(245,158,11,.3);margin-bottom:2px" onclick="openDealerDetail(\'' + escQ(dd.id) + '\')">' + escH(dd.name) + '</div><div style="color:var(--text-3);font-size:11px">' + escH(dd.email) + '</div></td>' +
          '<td class="table-td"><span class="badge ' + (dd.isActive ? 'badge-success' : 'badge-danger') + '">' + (dd.isActive ? 'Active' : 'Suspended') + '</span></td>' +
          '<td class="table-td">' + (dd.vehicles || 0) + '</td>' +
          '<td class="table-td" style="color:var(--emerald);font-weight:500">' + fmt(invVal) + '</td>' +
          '<td class="table-td">' + (dd.leads || 0) + '</td>' +
          '<td class="table-td">' + (dd.calls || 0) + '</td>' +
          '<td class="table-td"><span class="cost-badge">' + fmtCost(callCost) + '</span></td>' +
          '<td class="table-td" style="color:var(--sky)">' + fmtDurationFull(callDur) + '</td>' +
          '<td class="table-td"><div style="display:flex;gap:4px">' +
          '<button onclick="openDealerDetail(\'' + escQ(dd.id) + '\')" class="btn btn-ghost btn-icon" style="color:var(--sky)">' + icon('eye', 14) + '</button>' +
          '<button onclick="openDealershipModal(\'' + escQ(dd.id) + '\')" class="btn btn-ghost btn-icon">' + icon('pencil', 14) + '</button>' +
          '<button onclick="toggleDealership(\'' + escQ(dd.id) + '\')" class="btn btn-ghost btn-icon" style="color:' + (dd.isActive ? 'var(--emerald)' : 'var(--text-3)') + '" title="' + (dd.isActive ? 'Turn Off' : 'Turn On') + '">' + icon(dd.isActive ? 'toggle_on' : 'toggle_off', 16) + '</button>' +
          '</div></td></tr>';
      }).join('')) +
    '</tbody></table></div></div>';
}

/* ── ADMIN: DEALER DETAIL ─────────────────────────────────────── */
function openDealerDetail(id) { STATE.dealerDetailId = id; STATE.dealerDetailTab = 'overview'; navigate('dealer-detail'); }
function rerenderDealerDetail() { rerenderPage('dealer-detail'); }
function renderDealerDetail() {
  var d = STATE.dealerships.find(function (x) { return x.id === STATE.dealerDetailId; });
  if (!d) return '<div class="empty-state">Dealership not found.<br><button onclick="navigate(\'dealerships\')" class="btn btn-secondary" style="margin-top:16px">Back</button></div>';
  var dV = STATE.vehicles.filter(function (v) { return v.dealershipId === d.id; });
  var dL = STATE.leads.filter(function (l) { return l.dealershipId === d.id; });
  var dC = STATE.calls.filter(function (c) { return c.dealershipId === d.id; });
  var dU = STATE.users.filter(function (u) { return u.dealershipId === d.id; });
  var dCost = dC.reduce(function (s, c) { return s + (c.cost || 0); }, 0);
  var dDur = dC.reduce(function (s, c) { return s + (c.duration || 0); }, 0);
  var dVal = dV.reduce(function (s, v) { return s + (v.price || 0); }, 0);
  var tab = STATE.dealerDetailTab || 'overview';
  var tabs = [{ id: 'overview', label: 'Overview' }, { id: 'calls', label: 'Calls (' + dC.length + ')' }, { id: 'leads', label: 'Leads (' + dL.length + ')' }, { id: 'vehicles', label: 'Vehicles (' + dV.length + ')' }, { id: 'users', label: 'Users (' + dU.length + ')' }, { id: 'settings', label: 'Settings' }];
  var header = '<button class="back-btn" onclick="navigate(\'dealerships\')">' + icon('back', 14) + ' Back to Dealerships</button>' +
    '<div class="dealer-detail-header"><div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px">' +
    '<div style="display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);display:flex;align-items:center;justify-content:center;font-family:\'Syne\',sans-serif;font-weight:700;font-size:18px;color:var(--amber)">' + escH((d.name || '?').slice(0, 2).toUpperCase()) + '</div>' +
    '<div><div style="font-family:\'Syne\',sans-serif;font-weight:700;font-size:20px;color:var(--text-1)">' + escH(d.name) + '</div><div style="font-size:13px;color:var(--text-3);margin-top:4px;display:flex;align-items:center;gap:12px"><span>' + escH(d.email) + '</span>' + (d.phone ? '<span>' + escH(d.phone) + '</span>' : '') + '</div></div></div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="badge ' + planBadge(d.plan) + '">' + escH(d.plan || '–') + '</span><span class="badge ' + (d.isActive ? 'badge-success' : 'badge-danger') + '">' + (d.isActive ? 'Active' : 'Suspended') + '</span>' +
    '<button onclick="openDealershipModal(\'' + escQ(d.id) + '\')" class="btn btn-secondary btn-sm">' + icon('pencil', 13) + ' Edit</button>' +
    '<button onclick="toggleDealership(\'' + escQ(d.id) + '\')" class="btn ' + (d.isActive ? 'btn-danger' : 'btn-success') + ' btn-sm">' + (d.isActive ? 'Suspend' : 'Activate') + '</button></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;margin-top:20px">' +
    miniStat(dV.length, 'Vehicles', '') + miniStat(dL.length, 'Leads', '') + miniStat(dC.length, 'Calls', '') +
    miniStat(dL.filter(function (l) { return l.score === 'HOT'; }).length, 'Hot Leads', 'var(--rose)') +
    miniStat(fmtCost(dCost), 'Call Cost', 'var(--rose)') + miniStat(fmtDurationFull(dDur), 'Total Duration', 'var(--sky)') + miniStat(fmt(dVal), 'Inventory Value', 'var(--emerald)') +
    '</div></div>';
  var tabBar = '<div class="tab-bar">' + tabs.map(function (t) { return '<button class="tab-btn' + (tab === t.id ? ' active' : '') + '" onclick="STATE.dealerDetailTab=\'' + escQ(t.id) + '\';rerenderDealerDetail()">' + t.label + '</button>'; }).join('') + '</div>';
  var tabContent = '';
  if (tab === 'overview') {
    var outcomes = { BOOKED_VISIT: 0, FOLLOW_UP: 0, NOT_INTERESTED: 0, UNANSWERED: 0 };
    dC.forEach(function (c) { outcomes[c.outcome] = (outcomes[c.outcome] || 0) + 1; });
    var outMax = Math.max.apply(null, Object.values(outcomes)) || 1;
    tabContent = '<div class="two-col">' +
      '<div class="card card-p"><div class="section-title">' + icon('phone', 15) + ' Call Outcomes</div><div class="bar-chart" style="height:100px">' +
      Object.entries(outcomes).map(function (e) { var pct = Math.round((e[1] / outMax) * 100); var colors = { BOOKED_VISIT: 'var(--emerald)', FOLLOW_UP: 'var(--amber)', NOT_INTERESTED: 'var(--text-3)', UNANSWERED: 'var(--rose)' }; return '<div class="bar-col"><div class="bar-val">' + e[1] + '</div><div class="bar-fill" style="height:' + (pct || 4) + '%;background:' + colors[e[0]] + ';width:100%;border-radius:4px 4px 0 0"></div><div class="bar-label">' + outcomeLabel(e[0]).replace(' ', '\u00AD') + '</div></div>'; }).join('') +
      '</div></div>' +
      '<div class="card card-p"><div class="section-title">' + icon('trending', 15) + ' Lead Scores</div>' +
      [['HOT', dL.filter(function (l) { return l.score === 'HOT'; }).length, '#f87171'], ['WARM', dL.filter(function (l) { return l.score === 'WARM'; }).length, 'var(--amber)'], ['COLD', dL.filter(function (l) { return l.score === 'COLD'; }).length, 'var(--sky)']].map(function (s) { var pct = dL.length > 0 ? Math.round(s[1] / dL.length * 100) : 0; return '<div class="progress-row"><div class="progress-info"><span style="font-size:13px;color:var(--text-2)">' + s[0] + '</span><span style="font-size:12px;color:var(--text-3)">' + s[1] + ' (' + pct + '%)</span></div><div class="progress-bar"><div class="progress-fill" data-w="' + pct + '" style="width:0;background:' + s[2] + '"></div></div></div>'; }).join('') +
      '</div></div>';
  } else if (tab === 'calls') { tabContent = renderDTCalls(dC); }
  else if (tab === 'leads') { tabContent = renderDTLeads(dL); }
  else if (tab === 'vehicles') { tabContent = renderDTVehicles(dV); }
  else if (tab === 'users') { tabContent = renderDTUsers(dU); }
  else if (tab === 'settings') { tabContent = renderDTSettings(d); }
  return header + tabBar + tabContent;
}
function renderDTCalls(calls) {
  var s = (STATE.detCSearch || '').toLowerCase(), fO = STATE.detCOut || '';
  var c = calls.filter(function (x) { return (!s || (x.callerName || '').toLowerCase().includes(s) || (x.callerPhone || '').toLowerCase().includes(s)) && (!fO || x.outcome === fO); });
  var html = '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search caller..." value="' + escH(STATE.detCSearch) + '" oninput="STATE.detCSearch=this.value;rerenderDealerDetail()" maxlength="100"></div><select class="input" style="width:auto;min-width:140px" onchange="STATE.detCOut=this.value;rerenderDealerDetail()"><option value="">All Outcomes</option><option value="BOOKED_VISIT" ' + (fO === 'BOOKED_VISIT' ? 'selected' : '') + '>Booked</option><option value="FOLLOW_UP" ' + (fO === 'FOLLOW_UP' ? 'selected' : '') + '>Follow Up</option><option value="UNANSWERED" ' + (fO === 'UNANSWERED' ? 'selected' : '') + '>Unanswered</option></select></div>';
  if (c.length === 0) return html + '<div class="empty-state">' + icon('phone', 28) + '<br>No calls found</div>';
  return html + '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr><th class="table-th table-th-num">#</th><th class="table-th">Date</th><th class="table-th">Caller</th><th class="table-th">Duration</th><th class="table-th">Outcome</th><th class="table-th">Cost</th><th class="table-th">Recording</th></tr></thead><tbody>' + c.map(function (cc, i) { return '<tr><td class="table-td-num">' + (i + 1) + '</td><td class="table-td" style="font-size:12px">' + fmtDate(cc.call_at) + '</td><td class="table-td"><div style="color:var(--text-1);font-weight:500">' + escH(cc.callerName || '–') + '</div><div style="font-size:11px;color:var(--text-3)">' + escH(cc.callerPhone) + '</div></td><td class="table-td">' + fmtDuration(cc.duration) + '</td><td class="table-td"><span class="badge ' + outcomeBadge(cc.outcome) + '">' + outcomeLabel(cc.outcome) + '</span></td><td class="table-td"><span class="cost-badge">' + fmtCost(cc.cost) + '</span></td><td class="table-td">' + (cc.recordingUrl ? '<a href="' + escH(cc.recordingUrl) + '" target="_blank" class="recording-link">Play</a>' : '<span style="color:var(--text-3);font-size:12px">None</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
}
function renderDTLeads(leads) {
  var s = (STATE.detLSearch || '').toLowerCase(), fS = STATE.detLScore || '';
  var l = leads.filter(function (x) { return (!s || (x.customerName || '').toLowerCase().includes(s) || (x.phoneNumber || '').toLowerCase().includes(s)) && (!fS || x.score === fS); });
  var html = '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search name or phone..." value="' + escH(STATE.detLSearch) + '" oninput="STATE.detLSearch=this.value;rerenderDealerDetail()" maxlength="100"></div><select class="input" style="width:auto;min-width:140px" onchange="STATE.detLScore=this.value;rerenderDealerDetail()"><option value="">All Scores</option><option value="HOT" ' + (fS === 'HOT' ? 'selected' : '') + '>HOT</option><option value="WARM" ' + (fS === 'WARM' ? 'selected' : '') + '>WARM</option><option value="COLD" ' + (fS === 'COLD' ? 'selected' : '') + '>COLD</option></select></div>';
  if (l.length === 0) return html + '<div class="empty-state">' + icon('users', 28) + '<br>No leads found</div>';
  return html + '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr><th class="table-th table-th-num">#</th><th class="table-th">Customer</th><th class="table-th">Car Interested</th><th class="table-th">Score</th><th class="table-th">Added</th></tr></thead><tbody>' + l.map(function (ll, i) { return '<tr><td class="table-td-num">' + (i + 1) + '</td><td class="table-td"><div style="color:var(--text-1);font-weight:500">' + escH(ll.customerName) + '</div><div style="font-size:11px;color:var(--text-3)">' + escH(ll.phoneNumber) + '</div></td><td class="table-td">' + escH(ll.carInterested || '–') + '</td><td class="table-td">' + (ll.score ? '<span class="badge ' + scoreBadge(ll.score) + '">' + ll.score + '</span>' : '–') + '</td><td class="table-td" style="font-size:11px;color:var(--text-3)">' + fmtDateShort(ll.created_at) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
}
function renderDTVehicles(vehicles) {
  var s = (STATE.detVSearch || '').toLowerCase();
  var v = vehicles.filter(function (x) { return !s || (x.make || '').toLowerCase().includes(s) || (x.model || '').toLowerCase().includes(s); });
  var html = '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search make or model..." value="' + escH(STATE.detVSearch) + '" oninput="STATE.detVSearch=this.value;rerenderDealerDetail()" maxlength="100"></div></div>';
  if (v.length === 0) return html + '<div class="empty-state">' + icon('car', 28) + '<br>No vehicles found</div>';
  return html + '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr><th class="table-th table-th-num">#</th><th class="table-th">Make &amp; Model</th><th class="table-th">Year</th><th class="table-th">Price</th><th class="table-th">Status</th></tr></thead><tbody>' + v.map(function (vv, i) { return '<tr><td class="table-td-num">' + (i + 1) + '</td><td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(vv.make) + ' ' + escH(vv.model) + '</span></td><td class="table-td">' + escH(vv.year) + '</td><td class="table-td" style="font-weight:600;color:var(--text-1)">' + fmt(vv.price) + '</td><td class="table-td"><span class="badge ' + (vv.isAvailable ? 'badge-success' : 'badge-neutral') + '">' + (vv.isAvailable ? 'Available' : 'Sold') + '</span></td></tr>'; }).join('') + '</tbody></table></div></div>';
}
function renderDTUsers(users) {
  var s = (STATE.detUSearch || '').toLowerCase();
  var u = users.filter(function (x) { return !s || (x.name || '').toLowerCase().includes(s) || (x.email || '').toLowerCase().includes(s); });
  var html = '<div class="filters-bar"><div style="position:relative;flex:1;min-width:180px"><div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none">' + icon('search', 14) + '</div><input class="input" style="padding-left:38px" placeholder="Search name or email..." value="' + escH(STATE.detUSearch) + '" oninput="STATE.detUSearch=this.value;rerenderDealerDetail()" maxlength="100"></div></div>';
  if (u.length === 0) return html + '<div class="empty-state">' + icon('shield', 28) + '<br>No users found</div>';
  return html + '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table><thead><tr><th class="table-th table-th-num">#</th><th class="table-th">Name</th><th class="table-th">Email</th><th class="table-th">Role</th></tr></thead><tbody>' + u.map(function (uu, i) { return '<tr><td class="table-td-num">' + (i + 1) + '</td><td class="table-td"><span style="color:var(--text-1);font-weight:500">' + escH(uu.name) + '</span></td><td class="table-td" style="color:var(--text-3)">' + escH(uu.email) + '</td><td class="table-td"><span class="badge ' + roleBadge(uu.role) + '">' + escH(uu.role) + '</span></td></tr>'; }).join('') + '</tbody></table></div></div>';
}
function renderDTSettings(d) {
  return '<div class="card card-p"><div class="section-title">' + icon('shield', 15) + ' Dealership Info</div>' +
    '<div class="info-row"><div class="info-label">Name</div><div class="info-val">' + escH(d.name) + '</div></div>' +
    '<div class="info-row"><div class="info-label">Email</div><div class="info-val">' + escH(d.email) + '</div></div>' +
    '<div class="info-row"><div class="info-label">Phone</div><div class="info-val">' + escH(d.phone || '–') + '</div></div>' +
    '<div class="info-row"><div class="info-label">Plan</div><div class="info-val"><span class="badge ' + planBadge(d.plan) + '">' + escH(d.plan || '–') + '</span></div></div>' +
    '<div class="info-row"><div class="info-label">Status</div><div class="info-val"><span class="badge ' + (d.isActive ? 'badge-success' : 'badge-danger') + '">' + (d.isActive ? 'Active' : 'Suspended') + '</span></div></div>' +
    '<div class="info-row"><div class="info-label">Agent ID</div><div class="info-val" style="font-size:12px;font-family:monospace">' + escH(d.agent_id || '–') + '</div></div>' +
    '<div class="info-row"><div class="info-label">Joined</div><div class="info-val">' + escH(d.joined || fmtDateShort(d.created_at) || '–') + '</div></div></div>' +
    '<div style="margin-top:16px;display:flex;gap:10px">' +
    '<button onclick="openDealershipModal(\'' + escQ(d.id) + '\')" class="btn btn-secondary">' + icon('pencil', 14) + ' Edit Details</button>' +
    '<button onclick="addLeadForDealer(\'' + escQ(d.id) + '\')" class="btn btn-primary">' + icon('user_plus', 14) + ' Add Lead</button></div>';
}

/* ── ADMIN: ANALYTICS ─────────────────────────────────────────── */
/* ── ADMIN: ANALYTICS ─────────────────────────────────────────── */
function renderAnalytics() {
  var dOpts = '<option value="">Global Analytics (All Dealerships)</option>' + STATE.dealerships.map(function (dd) { return '<option value="' + escH(dd.id) + '" ' + (STATE.adminAnaDealer === dd.id ? 'selected' : '') + '>' + escH(dd.name) + '</option>'; }).join('');

  var fD = STATE.adminAnaDealer || '';
  var dList = STATE.dealerships;
  var cList = STATE.calls;
  var lList = STATE.leads;
  var vList = STATE.vehicles;

  if (fD) {
    dList = dList.filter(function (x) { return x.id === fD; });
    cList = cList.filter(function (x) { return x.dealershipId === fD; });
    lList = lList.filter(function (x) { return x.dealershipId === fD; });
    vList = vList.filter(function (x) { return x.dealershipId === fD; });
  }

  var plans = { STARTER: 0, GROWTH: 0, ENTERPRISE: 0 };
  dList.forEach(function (x) { plans[x.plan] = (plans[x.plan] || 0) + 1; });
  var tL = lList.length, tC = cList.length, tV = vList.length;
  var act = dList.filter(function (x) { return x.isActive; }).length;
  var planRates = { STARTER: 99, GROWTH: 249, ENTERPRISE: 599 }, planColors = { STARTER: '#4a5a72', GROWTH: '#38bdf8', ENTERPRISE: '#fbbf24' };
  var monthlyRevenue = Object.entries(plans).reduce(function (s, e) { return s + e[1] * (planRates[e[0]] || 0); }, 0);
  var planTotal = Object.values(plans).reduce(function (s, v) { return s + v; }, 0) || 1;
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], now = new Date().getMonth();
  var monthCalls = months.slice(0, now + 1).map(function (m, i) { return Math.round(tC / 12 * (0.4 + i * 0.07 + Math.random() * 0.3)); });
  var maxMC = Math.max.apply(null, monthCalls) || 1;

  return '<div class="page-header"><div class="page-title font-display">Platform Analytics</div><div class="page-sub">Insights and metrics powered by CallVora AI</div></div>' +
    '<div class="filters-bar" style="margin-bottom:24px"><select class="input" style="max-width:320px;font-weight:600;color:var(--amber)" onchange="STATE.adminAnaDealer=this.value;rerenderPage(\'analytics\')">' + dOpts + '</select></div>' +
    '<div class="stats-grid" style="margin-bottom:28px">' +
    mkAdminStatCard('phone', 'Total Calls', tC, '', 'all-calls', '') + mkAdminStatCard('users', 'Total Leads', tL, '', 'all-leads', '') + mkAdminStatCard('car', 'Vehicles Listed', tV, '', 'all-vehicles', '') + mkAdminStatCard('building', 'Active Dealers', act, dList.length + ' total', 'dealerships', '') +
    '<div class="stat-card accent"><div class="stat-icon stat-icon-accent" style="color:var(--amber)">' + icon('dollar', 16) + '</div><div><div class="stat-value" style="font-size:18px">₹' + monthlyRevenue.toLocaleString() + '</div><div class="stat-label">Est. MRR</div></div></div>' +
    '</div>' +
    '<div class="card card-p" style="margin-bottom:20px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div class="section-title" style="margin:0">' + icon('trending', 15) + ' Monthly Call Volume</div><span style="font-size:12px;color:var(--text-3)">Jan–' + months[now] + '</span></div>' +
    '<div class="bar-chart" style="height:140px">' + monthCalls.map(function (v, i) { var pct = Math.round((v / maxMC) * 100), isNow = i === monthCalls.length - 1; return '<div class="bar-col"><div class="bar-val">' + v + '</div><div style="height:' + (pct || 4) + '%;background:' + (isNow ? 'linear-gradient(to top,var(--amber),#fbbf24)' : 'rgba(245,158,11,.25)') + ';width:100%;border-radius:4px 4px 0 0;min-height:4px;transition:height .8s"></div><div class="bar-label">' + months[i] + '</div></div>'; }).join('') + '</div></div>' +
    '<div class="three-col" style="margin-bottom:20px">' +
    '<div class="card card-p"><div class="section-title">' + icon('dollar', 15) + ' Subscription Plans</div>' + Object.entries(plans).map(function (e) { var p = e[0], ct = e[1], pct = Math.round(ct / planTotal * 100); return '<div class="progress-row"><div class="progress-info"><div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:2px;background:' + planColors[p] + '"></div><span style="font-size:13px;color:var(--text-2)">' + p + '</span></div><span style="font-size:12px;color:var(--text-3)">' + ct + ' (' + pct + '%)</span></div><div class="progress-bar"><div class="progress-fill" data-w="' + pct + '" style="width:0;background:' + planColors[p] + '"></div></div></div>'; }).join('') + '</div>' +
    '<div class="card card-p"><div class="section-title">' + icon('star', 15) + ' Top Performers</div>' + ([...dList].sort(function (a, b) { return ((b.calls || 0) + (b.leads || 0)) - ((a.calls || 0) + (a.leads || 0)); }).slice(0, 5).map(function (x, i) { var medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']; return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:' + (i < 4 ? '1px solid var(--border-sub)' : 'none') + ';cursor:pointer" onclick="openDealerDetail(\'' + escQ(x.id) + '\')"><div style="font-size:15px;width:22px">' + medals[i] + '</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escH(x.name) + '</div><div style="font-size:11px;color:var(--text-3)">' + ((x.calls || 0) + (x.leads || 0)) + ' activity</div></div><span class="badge ' + planBadge(x.plan) + '">' + x.plan + '</span></div>'; }).join('')) || '<div class="empty-state" style="padding:20px">No data</div>' +
    '</div>' +
    '<div class="card card-p"><div class="section-title">' + icon('chart', 15) + ' Call Outcomes</div>' + [{ l: 'Booked Visit', v: Math.round(tC * .35), c: '#10b981' }, { l: 'Follow-up', v: Math.round(tC * .28), c: '#f59e0b' }, { l: 'Not Interested', v: Math.round(tC * .22), c: '#4a5a72' }, { l: 'Unanswered', v: Math.round(tC * .15), c: '#f43f5e' }].map(function (o) { var pct = tC > 0 ? Math.round(o.v / tC * 100) : 0; return '<div class="progress-row"><div class="progress-info"><span style="font-size:13px;color:var(--text-2)">' + o.l + '</span><span style="font-size:12px;color:var(--text-3)">' + o.v + ' (' + pct + '%)</span></div><div class="progress-bar"><div class="progress-fill" data-w="' + pct + '" style="width:0;background:' + o.c + '"></div></div></div>'; }).join('') + '</div>' +
    '</div>';
}

/* ── AI ASSISTANT ─────────────────────────────────────────── */
function renderAIAssistant() {
  var msgs = STATE.aiMessages;
  var totalCost = STATE.calls.reduce(function (s, c) { return s + (parseFloat(c.cost) || 0); }, 0);
  var totalDur = STATE.calls.reduce(function (s, c) { return s + (parseInt(c.duration) || 0); }, 0);

  // Custom AI Logo (Requires the user to save the image as logo.jpg in the project folder)
  var aiAvatar = '<img src="./logo.jpg" style="width:100%;height:100%;border-radius:50%;object-fit:cover;background:white;">';
  var userAvatar = '<img src="https://api.dicebear.com/7.x/initials/svg?seed=' + escH(STATE.currentUser?.name || 'U') + '&backgroundColor=334155" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';

  var msgsHtml = msgs.length === 0
    ? '<div class="ai-empty"><div class="ai-empty-icon" style="width:64px;height:64px;margin:0 auto 16px;">' + aiAvatar + '</div><p>Ask me anything about your dealerships, vehicles, leads, calls, or users.</p></div>'
    : msgs.map(function (m) { return '<div class="ai-msg ai-msg-' + escH(m.role) + '"><div class="ai-msg-avatar" style="padding:0;overflow:hidden;background:white;">' + (m.role === 'user' ? userAvatar : aiAvatar) + '</div><div class="ai-msg-bubble">' + (m.role === 'assistant' ? formatAIMessage(m.content) : escH(m.content)) + '</div></div>'; }).join('');

  var typingHtml = STATE.aiTyping ? '<div class="ai-msg ai-msg-assistant"><div class="ai-msg-avatar" style="padding:0;overflow:hidden;background:white;">' + aiAvatar + '</div><div class="ai-msg-bubble ai-typing"><span></span><span></span><span></span></div></div>' : '';
  var clearBtn = msgs.length > 0 ? '<button class="btn btn-ghost btn-sm" onclick="STATE.aiMessages=[];rerenderPage(\'ai-assistant\');setTimeout(()=>document.getElementById(\'aiInput\')?.focus(),50);">Clear</button>' : '';

  var inputGroup = '<div style="position:relative;flex:1;display:flex;">' +
    '<input id="aiInput" class="ai-input" type="text" placeholder="Ask about your data... type @ to select a dealer" maxlength="500" ' +
    (!STATE.aiTyping ? 'autofocus' : '') + ' oninput="handleAIInput(this, event)" onkeydown="if(event.key===\'Enter\'){sendAIMessage();event.preventDefault();}" autocomplete="off">' +
    '<div id="mentionDropdown" class="mention-dropdown"></div>' +
    '</div>';

  return '<div class="page-header"><div class="page-title font-display">CallVora AI</div><div class="page-sub">Intelligent assistant with full database access</div></div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">' +
    '<div class="stat-chip">🚗 ' + STATE.vehicles.length + ' Vehicles</div>' +
    '<div class="stat-chip">👥 ' + STATE.leads.length + ' Leads</div>' +
    '<div class="stat-chip">📞 ' + STATE.calls.length + ' Calls</div>' +
    '<div class="stat-chip">🏢 ' + STATE.dealerships.length + ' Dealerships</div>' +
    '<div class="stat-chip">💷 ₹' + totalCost.toFixed(2) + ' spent</div>' +
    '<div class="stat-chip">⏱ ' + fmtDurationFull(totalDur) + ' total</div>' +
    '</div>' +
    '<div class="ai-chat-wrapper">' +
    '<div class="ai-messages" id="aiMessages">' + msgsHtml + typingHtml + '</div>' +
    '<div class="ai-input-row">' +
    inputGroup +
    (STATE.aiTyping ? '<button class="btn btn-primary" style="flex-shrink:0" disabled>Send</button>' : '<button class="btn btn-primary" style="flex-shrink:0" onclick="sendAIMessage()">Send</button>') + clearBtn +
    '</div>' +
    '</div>';
}

function formatAIMessage(text) {
  let s = escH(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/^#{1,3} (.+)$/gm, '<h4>$1</h4>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function handleAIInput(el, ev) {
  el.value = sanitizeInput(el.value);
  var val = el.value;
  var cursor = el.selectionStart;
  var textBeforeCursor = val.substring(0, cursor);
  var atIdx = textBeforeCursor.lastIndexOf('@');

  var drop = document.getElementById('mentionDropdown');
  if (!drop || STATE.currentUser?.role !== 'ADMIN') return;

  if (atIdx !== -1) {
    var search = textBeforeCursor.substring(atIdx + 1).toLowerCase();
    // Only show if there's no space after the @ symbol yet (i.e. still typing the name)
    if (!search.includes(' ')) {
      var matches = STATE.dealerships.filter(function (d) { return d.name && d.name.toLowerCase().includes(search); });
      if (matches.length > 0) {
        drop.innerHTML = matches.map(function (d) {
          return '<div class="mention-item" onmousedown="selectAIMention(\'' + escH(d.id) + '\', \'' + escH(d.name.replace(/'/g, "\\'")) + '\', ' + atIdx + '); event.preventDefault();">' +
            '<div class="mention-icon">🏢</div>' + escH(d.name) + '</div>';
        }).join('');
        drop.classList.add('show');
        return;
      }
    }
  }
  drop.classList.remove('show');
}

function selectAIMention(did, dname, atIdx) {
  var el = document.getElementById('aiInput');
  if (!el) return;
  var val = el.value;
  var before = val.substring(0, atIdx);
  var afterAt = val.substring(atIdx);
  var nextSpace = afterAt.indexOf(' ');
  var after = nextSpace === -1 ? '' : afterAt.substring(nextSpace);

  el.value = before + '@' + dname + ' ' + after;

  var drop = document.getElementById('mentionDropdown');
  if (drop) drop.classList.remove('show');

  // Set cursor position after the inserted mention
  var newCursorPos = before.length + dname.length + 2;
  el.focus();
  el.setSelectionRange(newCursorPos, newCursorPos);
}


const _aiRateLimit = { last: 0, minGap: 3000 };
async function sendAIMessage() {
  var inputEl = document.getElementById('aiInput');
  if (!inputEl) return;
  var raw = inputEl.value.trim();
  if (!raw || STATE.aiTyping) return;
  var now = Date.now();
  if (now - _aiRateLimit.last < _aiRateLimit.minGap) { showToast('Please wait a moment before sending again.', 'warn'); return; }
  _aiRateLimit.last = now;
  var msg = sanitizeInput(raw).slice(0, 500);
  if (!msg) return;
  inputEl.value = '';
  STATE.aiMessages.push({ role: 'user', content: msg });
  STATE.aiTyping = true;
  rerenderPage('ai-assistant');
  setTimeout(function () { var el = document.getElementById('aiMessages'); if (el) el.scrollTop = el.scrollHeight; }, 50);

  var v = STATE.vehicles; var l = STATE.leads; var c = STATE.calls;
  var d = STATE.dealerships; var u = STATE.users;

  // Extract explicit @ mention from msg
  var explicitDealerId = null;
  if (STATE.currentUser?.role === 'ADMIN') {
    for (var i = 0; i < STATE.dealerships.length; i++) {
      var dealer = STATE.dealerships[i];
      if (msg.includes('@' + dealer.name)) {
        explicitDealerId = dealer.id;
        break;
      }
    }
  }

  var filterId = explicitDealerId || (STATE.currentUser?.role !== 'ADMIN' ? STATE.currentUser?.dealershipId : null);

  if (filterId) {
    d = d.filter(function (x) { return x.id === filterId; });
    v = v.filter(function (x) { return x.dealershipId === filterId; });
    l = l.filter(function (x) { return x.dealershipId === filterId; });
    c = c.filter(function (x) { return x.dealershipId === filterId; });
  }

  var ctx = '=== PLATFORM SUMMARY ===\n';
  ctx += 'Dealerships: ' + d.length + ' | Vehicles: ' + v.length + ' | Leads: ' + l.length + ' | Calls: ' + c.length + ' | Users: ' + u.length + '\n';
  var totalCost = c.reduce(function (s, x) { return s + (parseFloat(x.cost) || 0); }, 0);
  var totalDur = c.reduce(function (s, x) { return s + (parseInt(x.duration) || 0); }, 0);
  ctx += 'Total Call Cost: ₹' + totalCost.toFixed(4) + ' | Total Duration: ' + fmtDurationFull(totalDur) + '\n\n';

  // --- UPDATED DEALERSHIP LOOP (WITH FINANCIALS) ---
  ctx += '=== DEALERSHIPS ===\n';
  d.forEach(function (x) {
    var dV = v.filter(function (vv) { return vv.dealershipId === x.id; });
    var dC = c.filter(function (cc) { return cc.dealershipId === x.id; });
    var inv = dV.reduce(function (sum, vv) { return sum + (vv.price || 0); }, 0);
    var cost = dC.reduce(function (sum, cc) { return sum + (cc.cost || 0); }, 0);
    var dur = dC.reduce(function (sum, cc) { return sum + (cc.duration || 0); }, 0);
    ctx += 'ID:' + x.id + ' Name:' + escH(x.name || '') + ' Plan:' + x.plan + ' Active:' + x.isActive + ' Leads:' + x.leads + ' Calls:' + x.calls + ' Vehicles:' + x.vehicles + ' InvValue:₹' + inv + ' CallCost:₹' + cost.toFixed(2) + ' CallDuration:' + dur + 's\n';
  });
  // -------------------------------------------------

  ctx += '\nNOTE: You (the AI) have tools to fetch detailed records from the database if needed. I am only providing you the high-level summary counts right now to save bandwidth.\n';

  var history = STATE.aiMessages.slice(-10).map(function (m) { return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }; });
  var body = {
    contents: history.slice(0, -1).concat([{ role: 'user', parts: [{ text: 'DATABASE CONTEXT:\n' + ctx + '\n\nUSER QUESTION: ' + msg }] }])
  };

  try {
    var sb = getSB();
    var session = await sb.auth.getSession();
    var token = session.data.session.access_token;

    var res = await fetch(SUPA_URL + '/functions/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });

    // Parse response
    var textOutput = await res.text();
    var data = null;
    try { data = JSON.parse(textOutput); } catch (err) { throw new Error('Invalid response from server: ' + textOutput); }

    // Display the real Google API error if one occurred 
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    var reply = '';
    if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
      reply = data.candidates[0].content.parts[0].text;
    } else {
      reply = '**DEBUG RAW PAYLOAD:** `' + textOutput + '`';
    }

    STATE.aiMessages.push({ role: 'assistant', content: reply });
    if (data._didMutate) {
      showToast('Database was successfully updated by AI', 'success');
    }
  } catch (e) {
    console.error('AI Error:', e);
    STATE.aiMessages.push({ role: 'assistant', content: '**Error contacting AI service:** ' + e.message });
  }
  STATE.aiTyping = false;
  rerenderPage('ai-assistant');
  setTimeout(function () {
    var el = document.getElementById('aiMessages'); if (el) el.scrollTop = el.scrollHeight;
    var inp = document.getElementById('aiInput'); if (inp) inp.focus(); // Re-focus AI text bar
  }, 50);
}

/* ── METRIC DETAIL MODALS ─────────────────────────────────── */
function showMetricDetail(type) {
  let title = '', bodyHtml = '';
  if (type === 'balance') {
    title = 'Inventory Value Breakdown';
    const avail = STATE.vehicles.filter(v => v.isAvailable);
    const sold = STATE.vehicles.filter(v => !v.isAvailable);
    const totalVal = STATE.vehicles.reduce((s, v) => s + (parseFloat(v.price) || 0), 0);
    const availVal = avail.reduce((s, v) => s + (parseFloat(v.price) || 0), 0);
    bodyHtml = `<div class="metric-summary"><div class="ms-row"><span>Total Vehicles</span><strong>${STATE.vehicles.length}</strong></div><div class="ms-row"><span>Available</span><strong>${avail.length}</strong></div><div class="ms-row"><span>Sold/Unavailable</span><strong>${sold.length}</strong></div><div class="ms-row"><span>Available Value</span><strong>₹${availVal.toLocaleString()}</strong></div><div class="ms-row total-row"><span>Total Inventory Value</span><strong>₹${totalVal.toLocaleString()}</strong></div></div>
    <div class="modal-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Year</th><th>Make</th><th>Model</th><th>Price</th><th>Status</th></tr></thead><tbody>${STATE.vehicles.map((v, i) => `<tr><td>${i + 1}</td><td>${escH(String(v.year || ''))}</td><td>${escH(v.make || '')}</td><td>${escH(v.model || '')}</td><td>₹${parseFloat(v.price || 0).toLocaleString()}</td><td><span class="badge ${v.isAvailable ? 'badge-success' : 'badge-neutral'}">${v.isAvailable ? 'Available' : 'Unavailable'}</span></td></tr>`).join('')}</tbody></table></div>`;
  } else if (type === 'cost') {
    title = 'Call Costs Breakdown';
    const totalCost = STATE.calls.reduce((s, c) => s + (parseFloat(c.cost) || 0), 0);
    bodyHtml = `<div class="metric-summary"><div class="ms-row"><span>Total Calls</span><strong>${STATE.calls.length}</strong></div><div class="ms-row total-row"><span>Total Cost</span><strong>₹${totalCost.toFixed(4)}</strong></div></div>
    <div class="modal-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Caller</th><th>Date</th><th>Duration</th><th>Outcome</th><th>Cost</th></tr></thead><tbody>${STATE.calls.map((c, i) => `<tr><td>${i + 1}</td><td>${escH(c.callerName || 'Unknown')}</td><td>${c.call_at ? new Date(c.call_at).toLocaleDateString() : ''}</td><td>${fmtDuration(c.duration)}</td><td>${escH(c.outcome || '')}</td><td>₹${parseFloat(c.cost || 0).toFixed(4)}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (type === 'duration') {
    title = 'Call Duration Breakdown';
    const totalDur = STATE.calls.reduce((s, c) => s + (parseInt(c.duration) || 0), 0);
    const avgDur = STATE.calls.length ? Math.round(totalDur / STATE.calls.length) : 0;
    bodyHtml = `<div class="metric-summary"><div class="ms-row"><span>Total Calls</span><strong>${STATE.calls.length}</strong></div><div class="ms-row"><span>Average Duration</span><strong>${fmtDuration(avgDur)}</strong></div><div class="ms-row total-row"><span>Total Duration</span><strong>${fmtDurationFull(totalDur)}</strong></div></div>
    <div class="modal-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Caller</th><th>Date</th><th>Duration</th><th>Outcome</th></tr></thead><tbody>${STATE.calls.map((c, i) => `<tr><td>${i + 1}</td><td>${escH(c.callerName || 'Unknown')}</td><td>${c.call_at ? new Date(c.call_at).toLocaleDateString() : ''}</td><td>${fmtDuration(c.duration)}</td><td>${escH(c.outcome || '')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  openModal('<div class="modal-header-bar"><h2>' + title + '</h2><button class="modal-close-btn" onclick="closeModalDirect()">✕</button></div><div class="modal-body-inner">' + bodyHtml + '</div>');
}


/* ── UNDO / REDO & CUSTOM CONFIRM ─────────────────────────────── */
window._pendingDelete = null;
function promptDelete(type, id) {
  window._pendingDelete = { type: type, id: id };
  var itemName = type === 'vehicle' ? 'this vehicle' : type === 'lead' ? 'this lead' : type === 'user' ? 'this user' : 'this dealership and all its data';
  openModal(
    '<div class="modal-header-bar"><h2>Confirm Deletion</h2><button class="modal-close-btn" onclick="closeModalDirect()">✕</button></div>' +
    '<div class="modal-body-inner">' +
    '<p style="margin-bottom:24px;color:var(--text-1);font-size:15px">Are you sure you want to permanently delete ' + itemName + '?</p>' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModalDirect()">Cancel</button><button class="btn btn-danger" onclick="executeDelete()">Delete</button></div>' +
    '</div>'
  );
}

async function executeDelete() {
  closeModalDirect();
  if (!window._pendingDelete) return;
  var pd = window._pendingDelete;
  window._pendingDelete = null;
  if (pd.type === 'vehicle') await deleteVehicle(pd.id);
  if (pd.type === 'lead') await deleteLead(pd.id);
  if (pd.type === 'dealership') await deleteDealership(pd.id);
  if (pd.type === 'user') await deleteUser(pd.id);
}

/* ── VEHICLE CRUD ─────────────────────────────────────────── */
function openVehicleModal(id) {
  var v = id ? STATE.vehicles.find(function (x) { return x.id == id; }) : null;
  var title = v ? 'Edit Vehicle' : 'Add Vehicle';

  // NEW: Dropdown so Admins can assign the vehicle to a specific dealership
  var cu = STATE.currentUser;
  var isAdmin = cu && cu.role === 'ADMIN';
  var dealerSelectHtml = '';
  if (isAdmin) {
    var selectedDealer = v ? v.dealershipId : '';
    dealerSelectHtml = '<div class="form-group form-full"><label>Assign to Dealership <span class="req">*</span></label><select id="vDealer" class="form-input"><option value="">Select a Dealership...</option>' +
      STATE.dealerships.map(function (d) { return '<option value="' + escH(d.id) + '" ' + (selectedDealer === d.id ? 'selected' : '') + '>' + escH(d.name) + '</option>'; }).join('') +
      '</select></div>';
  }

  // Smart Pre-fill Logic
  var stdFuels = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid'];
  var stdTrans = ['Automatic', 'Manual', 'Semi-Automatic', 'CVT'];

  var vFuelVal = v ? (v.fuelType || '') : '';
  var isCustomFuel = vFuelVal && !stdFuels.includes(vFuelVal);
  var selectFuel = isCustomFuel ? 'Other' : (stdFuels.includes(vFuelVal) ? vFuelVal : '');

  var vTransVal = v ? (v.transmission || '') : '';
  var isCustomTrans = vTransVal && !stdTrans.includes(vTransVal);
  var selectTrans = isCustomTrans ? 'Other' : (stdTrans.includes(vTransVal) ? vTransVal : '');

  openModal(
    '<div class="modal-header-bar"><h2>' + title + '</h2><button class="modal-close-btn" onclick="closeModalDirect()">✕</button></div>' +
    '<div class="modal-body-inner">' +
    '<div class="form-grid">' +
    dealerSelectHtml +
    '<div class="form-group"><label>Make <span class="req">*</span></label><input id="vMake" class="form-input" value="' + escH(v ? v.make || '' : '') + '" maxlength="60" placeholder="e.g. Toyota"></div>' +
    '<div class="form-group"><label>Model <span class="req">*</span></label><input id="vModel" class="form-input" value="' + escH(v ? v.model || '' : '') + '" maxlength="60" placeholder="e.g. Camry"></div>' +
    '<div class="form-group"><label>Year <span class="req">*</span></label><input id="vYear" class="form-input" type="number" value="' + (v ? v.year || '' : '') + '" min="1900" max="2100" placeholder="e.g. 2024"></div>' +
    '<div class="form-group"><label>Price (₹) <span class="req">*</span></label><input id="vPrice" class="form-input" type="number" value="' + (v ? v.price || '' : '') + '" min="0" placeholder="e.g. 15000"></div>' +
    '<div class="form-group"><label>Fuel Type</label>' +
    '<select id="vFuel" class="form-input" onchange="document.getElementById(\'vFuelCustomWrap\').style.display = this.value === \'Other\' ? \'block\' : \'none\'">' +
    '<option value="">Select Fuel...</option>' +
    '<option value="Petrol" ' + (selectFuel === 'Petrol' ? 'selected' : '') + '>Petrol</option>' +
    '<option value="Diesel" ' + (selectFuel === 'Diesel' ? 'selected' : '') + '>Diesel</option>' +
    '<option value="Electric" ' + (selectFuel === 'Electric' ? 'selected' : '') + '>Electric</option>' +
    '<option value="Hybrid" ' + (selectFuel === 'Hybrid' ? 'selected' : '') + '>Hybrid</option>' +
    '<option value="Plug-in Hybrid" ' + (selectFuel === 'Plug-in Hybrid' ? 'selected' : '') + '>Plug-in Hybrid</option>' +
    '<option value="Other" ' + (selectFuel === 'Other' ? 'selected' : '') + '>Other (Type manually)</option>' +
    '</select>' +
    '<div id="vFuelCustomWrap" style="display:' + (isCustomFuel ? 'block' : 'none') + '; margin-top:8px;">' +
    '<input id="vFuelCustom" class="form-input" placeholder="Enter custom fuel type" value="' + (isCustomFuel ? escH(vFuelVal) : '') + '" maxlength="60">' +
    '</div></div>' +
    '<div class="form-group"><label>Transmission</label>' +
    '<select id="vTrans" class="form-input" onchange="document.getElementById(\'vTransCustomWrap\').style.display = this.value === \'Other\' ? \'block\' : \'none\'">' +
    '<option value="">Select Transmission...</option>' +
    '<option value="Automatic" ' + (selectTrans === 'Automatic' ? 'selected' : '') + '>Automatic</option>' +
    '<option value="Manual" ' + (selectTrans === 'Manual' ? 'selected' : '') + '>Manual</option>' +
    '<option value="Semi-Automatic" ' + (selectTrans === 'Semi-Automatic' ? 'selected' : '') + '>Semi-Automatic</option>' +
    '<option value="CVT" ' + (selectTrans === 'CVT' ? 'selected' : '') + '>CVT</option>' +
    '<option value="Other" ' + (selectTrans === 'Other' ? 'selected' : '') + '>Other (Type manually)</option>' +
    '</select>' +
    '<div id="vTransCustomWrap" style="display:' + (isCustomTrans ? 'block' : 'none') + '; margin-top:8px;">' +
    '<input id="vTransCustom" class="form-input" placeholder="Enter custom transmission" value="' + (isCustomTrans ? escH(vTransVal) : '') + '" maxlength="60">' +
    '</div></div>' +
    '<div class="form-group"><label>Mileage</label><input id="vMileage" class="form-input" type="number" value="' + (v ? v.mileage || '' : '') + '" min="0" placeholder="e.g. 45000"></div>' +
    '<div class="form-group"><label>Available</label><select id="vAvail" class="form-input"><option value="true" ' + (v && v.isAvailable ? 'selected' : '') + '>Yes</option><option value="false" ' + (v && !v.isAvailable ? 'selected' : '') + '>No</option></select></div>' +
    '</div>' +
    '<div class="form-group"><label>Description</label><textarea id="vDesc" class="form-input" rows="3" maxlength="500" placeholder="Add vehicle details...">' + escH(v ? v.description || '' : '') + '</textarea></div>' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModalDirect()">Cancel</button><button class="btn btn-primary" onclick="saveVehicle(' + (v ? '\'' + escQ(String(v.id)) + '\'' : 'null') + ')">' + (v ? 'Update' : 'Create') + '</button></div>' +
    '</div>'
  );
}

async function saveVehicle(id) {
  var make = sanitizeInput(document.getElementById('vMake').value.trim());
  var model = sanitizeInput(document.getElementById('vModel').value.trim());
  var year = parseInt(document.getElementById('vYear').value) || null;
  var price = parseFloat(document.getElementById('vPrice').value) || 0;

  var fuelSelect = document.getElementById('vFuel').value;
  var fuel = sanitizeInput(fuelSelect === 'Other' ? document.getElementById('vFuelCustom').value.trim() : fuelSelect);

  var transSelect = document.getElementById('vTrans').value;
  var trans = sanitizeInput(transSelect === 'Other' ? document.getElementById('vTransCustom').value.trim() : transSelect);

  var mileage = parseInt(document.getElementById('vMileage').value) || 0;
  var avail = document.getElementById('vAvail').value === 'true';
  var desc = sanitizeInput(document.getElementById('vDesc').value.trim());

  var cu = STATE.currentUser;
  var isAdmin = cu && cu.role === 'ADMIN';
  var adminSelectEl = document.getElementById('vDealer');
  var selectedDealerId = adminSelectEl ? adminSelectEl.value : null;

  // STRICT VALIDATION
  if (!make || !model || !year || !price) { showToast('Make, Model, Year, and Price are required.', 'warn'); return; }
  if (isAdmin && !selectedDealerId) { showToast('Please select a Dealership to assign this vehicle to.', 'warn'); return; }

  var payload = { make: make, model: model, year: year, price: price, fuel_type: fuel, transmission: trans, mileage: mileage, is_available: avail, description: desc };

  if (selectedDealerId) { payload.dealership_id = selectedDealerId; }
  else if (!isAdmin && cu && cu.dealershipId) { payload.dealership_id = cu.dealershipId; }
  else if (!isAdmin && (!cu || !cu.dealershipId)) { 
    showToast('CRITICAL: Your user profile is missing a Dealership ID in the database. Contact an admin.', 'error'); 
    return; 
  }

  var sb = getSB(); if (!sb) return;
  try {
    var r = id ? await sb.from('vehicles').update(payload).eq('id', id).select() : await sb.from('vehicles').insert(payload).select();
    if (r.error) throw r.error;
    closeModalDirect();
    showToast(id ? 'Vehicle updated.' : 'Vehicle added.', 'success');

    if (r.data && r.data[0]) {
      var newVeh = nv(r.data[0]);
      if (id) {
        STATE.vehicles = STATE.vehicles.map(function (v) { return String(v.id) === String(id) ? newVeh : v; });
      } else {
        STATE.vehicles.unshift(newVeh);
      }
      var cp = STATE.currentPage;
      if (['cars', 'all-vehicles', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp);
    }
  } catch (e) { showToast('Error saving vehicle: ' + e.message, 'error'); }
}

async function deleteVehicle(id) {
  var sb = getSB(); if (!sb) return;
  var r = await sb.from('vehicles').delete().eq('id', id);
  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }
  STATE.vehicles = STATE.vehicles.filter(function (v) { return String(v.id) !== String(id); });
  var cp = STATE.currentPage;
  if (['cars', 'all-vehicles', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp);
  showToast('Vehicle deleted.', 'error');
}

/* ── LEAD CRUD ────────────────────────────────────────────── */
function openLeadModal(dealershipId) {
  var didSafe = escH(String(dealershipId || ''));
  var cu = STATE.currentUser;
  var isAdmin = cu && cu.role === 'ADMIN';

  // NEW: Dropdown so Admins can assign the lead to a specific dealership
  var dealerSelectHtml = '';
  if (isAdmin) {
    dealerSelectHtml = '<div class="form-group form-full"><label>Assign to Dealership <span class="req">*</span></label><select id="lDealer" class="form-input"><option value="">Select a Dealership...</option>' +
      STATE.dealerships.map(function (d) { return '<option value="' + escH(d.id) + '" ' + (didSafe === d.id ? 'selected' : '') + '>' + escH(d.name) + '</option>'; }).join('') +
      '</select></div>';
  }

  openModal(
    '<div class="modal-header-bar"><h2>Add Lead</h2><button class="modal-close-btn" onclick="closeModalDirect()">✕</button></div>' +
    '<div class="modal-body-inner">' +
    '<div class="form-grid">' +
    dealerSelectHtml +
    '<div class="form-group"><label>Customer Name <span class="req">*</span></label><input id="lName" class="form-input" maxlength="100" placeholder="e.g. John Doe"></div>' +
    '<div class="form-group"><label>Phone Number <span class="req">*</span></label><input id="lPhone" class="form-input" maxlength="30" placeholder="e.g. +44 7700 900077"></div>' +
    '<div class="form-group"><label>Car Interested In</label><input id="lCar" class="form-input" maxlength="120" placeholder="e.g. 2021 Toyota Camry"></div>' +
    '<div class="form-group"><label>Visit Date</label><input id="lVisit" class="form-input" type="date"></div>' +
    '</div>' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModalDirect()">Cancel</button><button class="btn btn-primary" onclick="saveLead(null,\'' + didSafe + '\')">Create Lead</button></div>' +
    '</div>'
  );
}

async function toggleDealership(id) {
  var d = STATE.dealerships.find(function (x) { return x.id === id; });
  if (!d) return;

  // 1. Determine the exact new state we want
  var newActive = !d.isActive;
  var newStatus = newActive ? 'active' : 'suspended'; // Keep text status perfectly in sync

  // 2. Update Supabase Database
  var sb = getSB(); if (!sb) return;
  var r = await sb.from('dealerships').update({
    is_active: newActive,
    status: newStatus
  }).eq('id', id);

  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }

  // 3. INSTANT LOCAL DATA UPDATE (Fixes the double-click bug)
  d.isActive = newActive;
  d.is_active = newActive;
  d.status = newStatus;

  // 4. Show the correct notification dot
  if (newActive) {
    showToast('Dealership activated.', 'success'); // Green Dot
  } else {
    showToast('Dealership deactivated.', 'error'); // Red Dot
  }

  // 5. INSTANT SCREEN REFRESH
  var cp = STATE.currentPage;
  if (cp === 'dealerships') rerenderPage('dealerships');
  if (cp === 'dealer-detail') rerenderPage('dealer-detail');
  if (cp === 'admin') rerenderPage('admin');
}

async function saveLead(id, dealershipId) {
  var name = sanitizeInput(document.getElementById('lName').value.trim());
  var phone = sanitizeInput(document.getElementById('lPhone').value.trim());
  var car = sanitizeInput(document.getElementById('lCar').value.trim());
  var visit = document.getElementById('lVisit').value || null;

  var cu = STATE.currentUser;
  var isAdmin = cu && cu.role === 'ADMIN';
  var adminSelectEl = document.getElementById('lDealer');
  var selectedDealerId = adminSelectEl ? adminSelectEl.value : null;

  // STRICT VALIDATION
  if (!name || !phone) { showToast('Customer Name and Phone Number are required.', 'warn'); return; }
  if (isAdmin && !id && !selectedDealerId && !dealershipId) { showToast('Please select a Dealership to assign this lead to.', 'warn'); return; }

  var payload = { customer_name: name, phone_number: phone, car_interested: car, visit_date: visit };

  if (selectedDealerId) { payload.dealership_id = selectedDealerId; }
  else if (dealershipId) { payload.dealership_id = dealershipId; }
  else if (cu && cu.dealershipId) { payload.dealership_id = cu.dealershipId; }
  else if (!isAdmin && (!cu || !cu.dealershipId)) { 
    showToast('CRITICAL: Your user profile is missing a Dealership ID in the database. Contact an admin.', 'error'); 
    return; 
  }

  var sb = getSB(); if (!sb) return;
  try {
    var r = id ? await sb.from('leads').update(payload).eq('id', id).select() : await sb.from('leads').insert(payload).select();
    if (r.error) throw r.error;
    closeModalDirect();
    showToast(id ? 'Lead updated.' : 'Lead created.', 'success');

    if (r.data && r.data[0]) {
      var newL = nl(r.data[0]);
      if (id) {
        STATE.leads = STATE.leads.map(function (l) { return String(l.id) === String(id) ? newL : l; });
      } else {
        STATE.leads.unshift(newL);
      }
      var cp = STATE.currentPage;
      if (['leads', 'all-leads', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp);
    }
  } catch (e) { showToast('Error saving lead: ' + e.message, 'error'); }
}

async function deleteLead(id) {
  var sb = getSB(); if (!sb) return;
  var r = await sb.from('leads').delete().eq('id', id);
  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }
  STATE.leads = STATE.leads.filter(function (l) { return String(l.id) !== String(id); });
  var cp = STATE.currentPage;
  if (['leads', 'all-leads', 'dashboard', 'admin', 'dealer-detail', 'analytics'].includes(cp)) rerenderPage(cp);
  showToast('Lead deleted.', 'error');
}

function addLeadForDealer(dealershipId) { openLeadModal(dealershipId); }

/* ── DEALERSHIP CRUD ──────────────────────────────────────── */
function openDealershipModal(editId) {
  var d = editId ? STATE.dealerships.find(function (x) { return x.id === editId; }) : null;
  var saveCall = d ? 'updateDealershipRecord(\'' + escQ(d.id) + '\')' : 'createDealership()';
  openModal(
    '<div class="modal-header-bar"><h2>' + (d ? 'Edit Dealership' : 'Add Dealership') + '</h2><button class="modal-close-btn" onclick="closeModalDirect()">✕</button></div>' +
    '<div class="modal-body-inner">' +
    '<div class="form-grid">' +
    '<div class="form-group"><label>Name</label><input id="dName" class="form-input" value="' + escH(d ? d.name || '' : '') + '" maxlength="120"></div>' +
    '<div class="form-group"><label>Email</label><input id="dEmail" class="form-input" type="email" value="' + escH(d ? d.email || '' : '') + '" maxlength="120"></div>' +
    '<div class="form-group"><label>Phone</label><input id="dPhone" class="form-input" value="' + escH(d ? d.phone || '' : '') + '" maxlength="30"></div>' +
    '<div class="form-group"><label>Plan</label><select id="dPlan" class="form-input">' +
    '<option value="starter" ' + (d && d.plan === 'starter' ? 'selected' : '') + '>Starter</option>' +
    '<option value="pro" ' + (d && d.plan === 'pro' ? 'selected' : '') + '>Pro</option>' +
    '<option value="enterprise" ' + (d && d.plan === 'enterprise' ? 'selected' : '') + '>Enterprise</option>' +
    '</select></div>' +
    '<div class="form-group"><label>Status</label><select id="dStatus" class="form-input">' +
    '<option value="active" ' + (d && d.status === 'active' ? 'selected' : '') + '>Active</option>' +
    '<option value="inactive" ' + (d && d.status === 'inactive' ? 'selected' : '') + '>Inactive</option>' +
    '<option value="suspended" ' + (d && d.status === 'suspended' ? 'selected' : '') + '>Suspended</option>' +
    '</select></div>' +
    '<div class="form-group"><label>Active</label><select id="dActive" class="form-input">' +
    '<option value="true" ' + (!d || d.isActive ? 'selected' : '') + '>Yes</option>' +
    '<option value="false" ' + (d && !d.isActive ? 'selected' : '') + '>No</option>' +
    '</select></div>' +
    '</div>' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModalDirect()">Cancel</button><button class="btn btn-primary" onclick="' + saveCall + '">' + (d ? 'Update' : 'Create') + '</button></div>' +
    '</div>'
  );
}

async function createDealership() {
  var name = sanitizeInput(document.getElementById('dName').value.trim());
  var email = sanitizeInput(document.getElementById('dEmail').value.trim());
  var phone = sanitizeInput(document.getElementById('dPhone').value.trim());
  var plan = document.getElementById('dPlan').value;
  var status = document.getElementById('dStatus').value;
  var active = document.getElementById('dActive').value === 'true';
  if (!name) { showToast('Dealership name is required.', 'warn'); return; }
  var sb = getSB(); if (!sb) return;
  var r = await sb.from('dealerships').insert({ name: name, email: email, phone: phone, plan: plan, status: status, is_active: active, joined: new Date().toISOString().split('T')[0] });
  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }
  closeModalDirect(); showToast('Dealership created.', 'success');
}

async function updateDealershipRecord(id) {
  var name = sanitizeInput(document.getElementById('dName').value.trim());
  var email = sanitizeInput(document.getElementById('dEmail').value.trim());
  var phone = sanitizeInput(document.getElementById('dPhone').value.trim());
  var plan = document.getElementById('dPlan').value;
  var status = document.getElementById('dStatus').value;
  var active = document.getElementById('dActive').value === 'true';

  // Auto-sync status based on active dropdown selection
  if (active && status === 'suspended') status = 'active';
  if (!active && status === 'active') status = 'suspended';

  if (!name) { showToast('Dealership name is required.', 'warn'); return; }

  var payload = { name: name, email: email, phone: phone, plan: plan, status: status, is_active: active };

  var sb = getSB(); if (!sb) return;
  var r = await sb.from('dealerships').update(payload).eq('id', id);
  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }

  closeModalDirect();
  showToast('Dealership updated.', 'success');

  // INSTANT LOCAL UI UPDATE & REFRESH (Fixes the delay)
  var d = STATE.dealerships.find(function (x) { return x.id === id; });
  if (d) {
    d.name = name; d.email = email; d.phone = phone; d.plan = plan; d.status = status; d.isActive = active; d.is_active = active;
  }
  var cp = STATE.currentPage;
  if (cp === 'dealerships') rerenderPage('dealerships');
  if (cp === 'dealer-detail') rerenderPage('dealer-detail');
}

async function toggleDealership(id) {
  var d = STATE.dealerships.find(function (x) { return x.id === id; });
  if (!d) return;

  // Determine the new state
  var newActive = !d.isActive;
  var newStatus = newActive ? 'active' : 'suspended';

  // Send to database
  var sb = getSB(); if (!sb) return;
  var r = await sb.from('dealerships').update({
    is_active: newActive,
    status: newStatus
  }).eq('id', id);

  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }

  // INSTANT LOCAL UI UPDATE (Fixes the delay)
  d.isActive = newActive;
  d.is_active = newActive;
  d.status = newStatus;

  if (newActive) {
    showToast('Dealership activated.', 'success'); // Green Dot
  } else {
    showToast('Dealership deactivated.', 'error'); // Red Dot
  }

  // INSTANT SCREEN REFRESH
  var cp = STATE.currentPage;
  if (cp === 'dealerships') rerenderPage('dealerships');
  if (cp === 'dealer-detail') rerenderPage('dealer-detail');
  if (cp === 'admin') rerenderPage('admin');
}

async function deleteDealership(id) {
  var sb = getSB(); if (!sb) return;
  var r = await sb.from('dealerships').delete().eq('id', id);
  if (r.error) { showToast('Error: ' + r.error.message, 'error'); return; }
  showToast('Dealership deleted.', 'error');
  navigate('dealerships');
}

/* ── ADMIN NOTIFICATIONS ──────────────────────────────────── */

/* ── USER CRUD (ADMIN ONLY) ───────────────────────────────── */
function openUserModal(editId) {
  var cu = STATE.currentUser;
  if (!cu || cu.role !== 'ADMIN') { showToast('Unauthorized', 'error'); return; }

  var u = editId ? STATE.users.find(function (x) { return x.id === editId; }) : null;
  var title = u ? 'Edit User' : 'Add New User';

  // For assignments, identify the active selected dealership
  var selectedDealer = u ? u.dealershipId : '';
  var dealerSelectHtml = '<div class="form-group"><label>Assign to Dealership</label><select id="uDealer" class="form-input"><option value="">No Dealership (Admin)</option>' +
    STATE.dealerships.map(function (d) { return '<option value="' + escH(d.id) + '" ' + (selectedDealer === d.id ? 'selected' : '') + '>' + escH(d.name) + '</option>'; }).join('') +
    '</select></div>';

  openModal(
    '<div class="modal-header-bar"><h2>' + title + '</h2><button class="modal-close-btn" onclick="closeModalDirect()">✕</button></div>' +
    '<div class="modal-body-inner">' +
    '<div class="form-grid">' +
    '<div class="form-group"><label>Name <span class="req">*</span></label><input id="uName" class="form-input" maxlength="100" value="' + escH(u ? u.name || '' : '') + '" placeholder="e.g. Jane Doe"></div>' +
    '<div class="form-group"><label>Email <span class="req">*</span></label><input id="uEmail" class="form-input" type="email" maxlength="120" value="' + escH(u ? u.email || '' : '') + '" placeholder="user@example.com"' + (u ? ' readonly style="opacity:0.6;cursor:not-allowed;"' : '') + '></div>' +
    '<div class="form-group"><label>Password ' + (u ? '<span style="font-size:11px;font-weight:normal;color:var(--text-3)">(Leave blank to keep current)</span>' : '<span class="req">*</span>') + '</label><input id="uPass" class="form-input" type="password" maxlength="60" placeholder="' + (u ? 'New password (min 6 chars)' : 'Min 6 characters') + '"></div>' +
    '<div class="form-group"><label>Role <span class="req">*</span></label><select id="uRole" class="form-input" onchange="document.getElementById(\'uDealerWrapper\').style.display = this.value === \'CLIENT\' ? \'block\' : \'none\'">' +
    '<option value="CLIENT" ' + (u && u.role === 'CLIENT' ? 'selected' : '') + '>Client</option>' +
    '<option value="ADMIN" ' + (u && u.role === 'ADMIN' ? 'selected' : (!u ? '' : '')) + '>Admin</option></select></div>' +
    '</div>' +
    '<div id="uDealerWrapper" style="display:' + (u && u.role === 'ADMIN' ? 'none' : 'block') + '; margin-top: 16px;">' + dealerSelectHtml + '</div>' +
    '<div class="modal-actions" style="margin-top:24px"><button class="btn btn-secondary" onclick="closeModalDirect()">Cancel</button><button class="btn btn-primary" onclick="saveUser(' + (u ? '\'' + escQ(String(u.id)) + '\'' : 'null') + ')">' + (u ? 'Update User' : 'Create User') + '</button></div>' +
    '</div>'
  );
}

async function saveUser(editId) {
  var name = sanitizeInput(document.getElementById('uName').value.trim());
  var email = sanitizeInput(document.getElementById('uEmail').value.trim());
  var password = document.getElementById('uPass').value;
  var role = document.getElementById('uRole').value;
  var dealerSelect = document.getElementById('uDealer');
  var dealerId = role === 'CLIENT' && dealerSelect ? dealerSelect.value : null;

  if (!name || !email) { showToast('Name and Email are required.', 'warn'); return; }
  if (!editId && !password) { showToast('Password is required for new users.', 'warn'); return; }
  if (password && password.length < 6) { showToast('Password must be at least 6 characters long.', 'warn'); return; }
  if (role === 'CLIENT' && !dealerId) { showToast('Clients must be assigned to a dealership.', 'warn'); return; }

  var sb = getSB(); if (!sb) return;
  var session = await sb.auth.getSession();
  if (!session.data.session) { showToast('Not authenticated', 'error'); return; }
  var token = session.data.session.access_token;

  showToast(editId ? 'Updating user...' : 'Creating user...', 'info');

  try {
    var res = await fetch(SUPA_URL + '/functions/v1/manage-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        action: editId ? 'updateUser' : 'createUser',
        payload: { userId: editId, email: email, password: password, name: name, role: role, dealership_id: dealerId }
      })
    });

    var textRes = await res.text();
    var data;
    try {
      data = JSON.parse(textRes);
    } catch (e) {
      throw new Error('Raw Server Error: ' + textRes);
    }

    if (!res.ok) throw new Error(data.error || 'Server error');

    closeModalDirect();
    showToast(editId ? 'User successfully updated.' : 'User successfully created.', 'success');

    // Add locally to state
    if (editId) {
      STATE.users = STATE.users.map(function (u) {
        if (String(u.id) === String(editId)) {
          return { ...u, name: name, role: role, dealershipId: dealerId };
        }
        return u;
      });
    } else {
      STATE.users.unshift({ id: data.user.id, name: name, email: email, role: role, dealershipId: dealerId, created_at: new Date().toISOString() });
    }

    var cp = STATE.currentPage;
    if (['all-users', 'admin'].includes(cp)) rerenderPage(cp);
  } catch (err) {
    showToast((editId ? 'Error updating user: ' : 'Error creating user: ') + err.message, 'error');
  }
}

async function deleteUser(id) {
  var sb = getSB(); if (!sb) return;
  var session = await sb.auth.getSession();
  if (!session.data.session) return;
  var token = session.data.session.access_token;

  try {
    var res = await fetch(SUPA_URL + '/functions/v1/manage-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'deleteUser', payload: { userId: id } })
    });

    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast('User deleted from the platform.', 'success');
    STATE.users = STATE.users.filter(function (u) { return String(u.id) !== String(id); });

    var cp = STATE.currentPage;
    if (['all-users', 'admin'].includes(cp)) rerenderPage(cp);
  } catch (err) {
    showToast('Error deleting user: ' + err.message, 'error');
  }
}

/* ── AUTH PERSISTENCE (STAYS LOGGED IN ON REFRESH) ────────────── */
window.addEventListener('DOMContentLoaded', async function () {
  var sb = getSB();
  if (!sb) return;

  // Check if the browser has a saved login session
  var { data } = await sb.auth.getSession();
  var session = data.session;

  if (session && session.user) {
    var uid = session.user.id;
    var email = session.user.email;

    // Fetch the user's profile details
    var uRes = await sb.from('users').select('*').eq('id', uid).maybeSingle(); 
    var role = 'CLIENT', name = email, dealershipId = null;

    if (!uRes.error && uRes.data) {
      role = String(uRes.data.role || 'CLIENT').toUpperCase();
      name = uRes.data.name || email;
      dealershipId = uRes.data.dealership_id || null;
    }

    // Restore the app state and bypass the login screen
    STATE.currentUser = { id: uid, email: email, role: role, name: name, dealershipId: dealershipId };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    initApp();
  }
});

async function renderRecharge() {
  var sb = getSB();

  // FETCH HISTORY DATA
  const { data: historyData } = await sb
    .from('recharge_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  var historyHtml = (historyData && historyData.length > 0)
    ? historyData.map(h => `
            <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                <strong>${h.dealership_name}</strong><br>
                <span style="color:var(--emerald)">New Cycle: ${new Date(h.new_cycle_date).toLocaleDateString()}</span>
            </div>`).join('')
    : '<div style="padding:20px; text-align:center; color:#999;">No history yet.</div>';

  // RENDER THE UI
  var page = document.getElementById('page-recharge');
  page.innerHTML = `
        <div class="page-header"><div class="page-title">Recharge Billing</div></div>
        <div class="two-col">
            <div class="card card-p">
                <div class="section-label">Recent History</div>
                ${historyHtml}
            </div>
            <div class="card card-p">
                <div class="section-label">Process Recharge</div>
                <select id="rech-dealer" class="form-input">
                    ${STATE.dealerships.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
                <input type="datetime-local" id="rech-date" class="form-input" style="margin-top:10px">
                <button class="btn btn-primary w-full" style="margin-top:15px" onclick="processRecharge()">Recharge Now</button>
            </div>
        </div>`;
}

async function processRecharge() {
  var selectEl = document.getElementById('rech-dealer');
  var did = selectEl.value;
  var dDate = document.getElementById('rech-date').value;

  if (!did || !dDate) { showToast('Select a dealer and date!', 'warn'); return; }

  // Get the name from the dropdown text
  var dName = selectEl.options[selectEl.selectedIndex].text.split(' (')[0];
  var isoDate = new Date(dDate).toISOString();
  var sb = getSB(); if (!sb) return;

  // UPDATE DEALER STATUS
  const { error: upError } = await sb.from('dealerships').update({
    cycle_start_date: isoDate,
    is_active: true,
    status: 'active'
  }).eq('id', did);

  if (upError) { showToast('Update failed', 'error'); return; }

  // INSERT INTO HISTORY TABLE
  const { error: logError } = await sb.from('recharge_history').insert([{
    dealership_id: did,
    dealership_name: dName,
    new_cycle_date: isoDate
  }]);

  if (logError) { console.error('History log failed:', logError); }

  showToast('Recharge logged and active!', 'success');
  renderRecharge(); // Refresh the page to show new data
}