/**
 * FileDrop — Group Room Server
 * Banyak pengirim & penerima dalam satu room
 * Setiap member bisa kirim ke member lain (pilih target)
 */

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// ── HTML Frontend (embedded) ─────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FileDrop — Group Transfer</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#07070f;--s1:#0e0e1c;--s2:#151526;--s3:#1b1b30;
  --bd:#20203a;--bd2:#2c2c55;
  --a1:#5b8dee;--a2:#ee5b9b;--a3:#5beea0;--a4:#eeb85b;
  --tx:#dde0f5;--mu:#555578;
  --fd:'Syne',sans-serif;--fm:'DM Mono',monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font-family:var(--fm);min-height:100vh}
body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 55% 40% at 8% 12%,rgba(91,141,238,.09) 0%,transparent 60%),
    radial-gradient(ellipse 45% 45% at 92% 88%,rgba(238,91,155,.07) 0%,transparent 60%),
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.014) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.014) 60px)}
.w{position:relative;z-index:1;max-width:820px;margin:0 auto;padding:28px 16px 50px}

/* Header */
header{text-align:center;margin-bottom:28px;animation:up .5s ease both}
.logo{font-family:var(--fd);font-size:42px;font-weight:800;letter-spacing:-3px;line-height:1;
  background:linear-gradient(135deg,var(--a1),var(--a2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sub{margin-top:6px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--mu)}

/* Card */
.card{background:var(--s1);border:1px solid var(--bd);border-radius:18px;padding:22px;margin-bottom:16px}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}

/* Join screen */
#joinScreen{animation:up .4s ease both}
.join-title{font-family:var(--fd);font-size:20px;font-weight:700;margin-bottom:6px}
.join-sub{font-size:11px;color:var(--mu);margin-bottom:20px;line-height:1.6}

.field{margin-bottom:14px}
.lbl{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--mu);margin-bottom:6px;display:block}
.inp{width:100%;padding:11px 13px;background:var(--s2);border:1px solid var(--bd);
  border-radius:10px;color:var(--tx);font-family:var(--fm);font-size:13px;outline:none;transition:border-color .18s}
.inp:focus{border-color:var(--a1)}
.inp-code{letter-spacing:6px;text-align:center;font-size:22px;font-weight:500}
.inp-code::placeholder{letter-spacing:2px;font-size:12px;font-weight:400;opacity:.35}

.or-row{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--mu);font-size:10px}
.or-row::before,.or-row::after{content:'';flex:1;height:1px;background:var(--bd)}

/* Buttons */
.btn{width:100%;padding:12px;border:none;border-radius:11px;font-family:var(--fd);font-size:14px;
  font-weight:700;cursor:pointer;transition:all .18s;position:relative;overflow:hidden;letter-spacing:.3px;color:white}
.btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.11),transparent);transition:left .3s}
.btn:hover:not(:disabled)::before{left:100%}
.btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 5px 20px rgba(91,141,238,.28)}
.btn:disabled{opacity:.3;cursor:not-allowed;transform:none!important}
.btn-b{background:linear-gradient(135deg,var(--a1),#3f6ac8)}
.btn-g{background:linear-gradient(135deg,var(--a3),#36b060);color:#07070f!important}
.btn-a2{background:linear-gradient(135deg,var(--a2),#c0407a)}
.btn-sm{width:auto;padding:6px 13px;font-size:11px;border-radius:8px;margin-top:0}
.btn-row{display:flex;gap:8px;margin-top:12px}
.btn-row .btn{margin-top:0}

/* Room screen */
#roomScreen{display:none}

/* Room header */
.room-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:gap}
.room-info{display:flex;align-items:center;gap:10px}
.room-badge{background:var(--s3);border:1px solid var(--bd2);border-radius:8px;
  padding:6px 12px;font-family:var(--fd);font-size:13px;font-weight:700;color:var(--a1);letter-spacing:4px}
.room-count{font-size:11px;color:var(--mu)}

/* WS status */
.ws-bar{display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:8px;
  font-size:10px;margin-bottom:14px;border:1px solid var(--bd);background:var(--s2)}
.ws-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:background .3s}
.ws-dot.ok{background:var(--a3)}.ws-dot.off{background:#ee5b5b}.ws-dot.spin{background:var(--a4);animation:blink 1s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}

/* Members list */
.members-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--mu);margin-bottom:10px}
.members{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.member{background:var(--s2);border:1px solid var(--bd);border-radius:10px;
  padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.member.me{border-color:var(--bd2)}
.member-left{display:flex;align-items:center;gap:9px}
.member-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;font-family:var(--fd);flex-shrink:0}
.member-name{font-size:12px;font-weight:500}
.member-tag{font-size:9px;color:var(--mu);margin-top:1px}
.btn-send-to{background:var(--a1);color:white;border:none;border-radius:7px;
  padding:5px 11px;font-family:var(--fm);font-size:10px;cursor:pointer;transition:all .16s;white-space:nowrap}
.btn-send-to:hover{background:#4070d0;transform:scale(1.04)}
.no-members{text-align:center;padding:20px;color:var(--mu);font-size:11px}

/* Send panel */
.send-panel{background:var(--s2);border:1px solid var(--bd);border-radius:13px;padding:16px;margin-bottom:14px;display:none}
.send-panel.on{display:block;animation:up .25s ease both}
.send-to-label{font-size:10px;color:var(--mu);margin-bottom:10px}
.send-to-name{color:var(--a1);font-weight:500}

/* Drop zone */
.dz{border:2px dashed var(--bd);border-radius:12px;padding:28px 18px;text-align:center;
  cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.dz::before{content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 50%,rgba(91,141,238,.08),transparent 70%);opacity:0;transition:opacity .2s}
.dz:hover::before,.dz.ov::before{opacity:1}
.dz:hover,.dz.ov{border-color:var(--a1)}
.di{font-size:32px;display:block;margin-bottom:8px}
.dt{font-family:var(--fd);font-size:14px;font-weight:700;margin-bottom:3px}
.ds{color:var(--mu);font-size:10px}
#fi{display:none}

/* File list */
.fl{margin-top:12px;display:flex;flex-direction:column;gap:5px}
.fitem{background:var(--s3);border:1px solid var(--bd);border-radius:9px;padding:8px 11px;display:flex;align-items:center;gap:8px}
.fth{width:34px;height:34px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;overflow:hidden}
.fth img{width:100%;height:100%;object-fit:cover;border-radius:6px}
.fm{flex:1;min-width:0}
.fn{font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs2{font-size:9px;color:var(--mu);margin-top:1px}
.frm{background:none;border:none;color:var(--mu);cursor:pointer;font-size:14px;padding:2px;transition:color .18s;flex-shrink:0}
.frm:hover{color:var(--a2)}

/* Transfer items */
.xfer-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.xi{background:var(--s2);border:1px solid var(--bd);border-radius:11px;padding:11px 12px}
.xi-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:6px}
.xi-who{font-size:9px;color:var(--mu);margin-bottom:6px}
.xi-name{font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.xi-pct{font-size:12px;font-weight:800;font-family:var(--fd);color:var(--a1);flex-shrink:0}
.xi-pct.green{color:var(--a3)}
.bar{height:5px;background:var(--s3);border-radius:99px;overflow:hidden;margin-bottom:8px}
.fill{height:100%;background:linear-gradient(90deg,var(--a1),var(--a2));border-radius:99px;width:0%;transition:width .08s linear}
.fill.done{background:linear-gradient(90deg,var(--a3),#38b060)}
.bg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.bc{background:var(--s3);border-radius:7px;padding:5px 7px}
.bl{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:var(--mu);margin-bottom:2px}
.bv{font-size:10px;font-weight:500;font-family:var(--fm);color:var(--tx)}
.bv.c1{color:var(--a1)}.bv.c3{color:var(--a4)}

/* Received files */
.recv-section{margin-top:14px}
.recv-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--mu);margin-bottom:8px}
.ri{background:var(--s2);border:1px solid rgba(91,238,160,.18);border-radius:10px;
  padding:9px 12px;display:flex;align-items:center;gap:9px;margin-bottom:6px;animation:up .3s ease both}
.dl{background:var(--a3);color:#07070f;border:none;border-radius:7px;
  padding:6px 11px;font-family:var(--fm);font-size:10px;font-weight:500;cursor:pointer;
  transition:all .16s;white-space:nowrap;text-decoration:none;display:inline-block}
.dl:hover{background:#40de82;transform:scale(1.04)}

/* Pill */
.pill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:99px;
  font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;margin-bottom:14px;transition:all .25s}
.pill.idle{background:rgba(85,85,120,.12);color:var(--mu);border:1px solid var(--bd)}
.pill.ok{background:rgba(91,238,160,.1);color:var(--a3);border:1px solid rgba(91,238,160,.3)}
.dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
.dot.blink{animation:blink 1.2s ease-in-out infinite}

/* Toast */
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%) translateY(55px);
  background:var(--s2);border:1px solid var(--bd2);border-radius:10px;padding:9px 16px;
  font-size:11px;z-index:999;transition:transform .26s cubic-bezier(.34,1.56,.64,1);
  white-space:nowrap;max-width:92vw;text-align:center}
.toast.on{transform:translateX(-50%) translateY(0)}

/* Share room */
.share-box{background:var(--s3);border:1px solid var(--bd);border-radius:9px;
  padding:8px 12px;display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer}
.share-url{flex:1;font-size:10px;color:var(--a1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

@media(max-width:500px){.logo{font-size:32px}.card{padding:16px}.bg{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<div class="w">
  <header>
    <div class="logo">FileDrop</div>
    <div class="sub">Group Room · P2P WebRTC · Hingga 500 MB</div>
  </header>

  <!-- ══ JOIN SCREEN ══ -->
  <div id="joinScreen">
    <div class="card">
      <div class="join-title">Masuk ke Room</div>
      <div class="join-sub">Buat room baru atau masuk ke room yang sudah ada. Semua member bisa saling kirim file.</div>

      <div class="field">
        <span class="lbl">Nama Kamu</span>
        <input class="inp" id="myName" placeholder="Contoh: Daniel" maxlength="20">
      </div>

      <button class="btn btn-b" onclick="createRoom()">✨ Buat Room Baru</button>

      <div class="or-row">atau masuk ke room yang ada</div>

      <div class="field">
        <span class="lbl">Kode Room (6 digit)</span>
        <input class="inp inp-code" id="joinCode" maxlength="6" placeholder="000000"
               oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)" inputmode="numeric">
      </div>
      <button class="btn btn-g" onclick="joinRoom()">📡 Masuk Room</button>
    </div>
  </div>

  <!-- ══ ROOM SCREEN ══ -->
  <div id="roomScreen">

    <!-- Room info bar -->
    <div class="card" style="padding:14px 18px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="room-badge" id="roomBadge">——————</div>
          <div>
            <div style="font-size:11px;font-weight:500" id="myNameDisplay">—</div>
            <div class="room-count" id="memberCount">0 member</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-sm btn-b" onclick="shareRoom()">🔗 Bagikan</button>
          <button class="btn btn-sm" style="background:var(--s3);color:var(--mu);border:1px solid var(--bd)" onclick="leaveRoom()">Keluar</button>
        </div>
      </div>
      <div class="share-box" id="shareBox" style="display:none" onclick="copyRoomLink()">
        <div class="share-url" id="shareUrl">—</div>
        <span style="font-size:10px;color:var(--mu);flex-shrink:0">Salin</span>
      </div>
    </div>

    <!-- WS status -->
    <div class="ws-bar">
      <div class="ws-dot spin" id="wsDot"></div>
      <span id="wsLbl">Menghubungkan...</span>
    </div>

    <!-- Members -->
    <div class="card">
      <div class="members-title">👥 Member Room</div>
      <div class="members" id="membersList">
        <div class="no-members">Belum ada member lain</div>
      </div>

      <!-- Send panel (shown when target selected) -->
      <div class="send-panel" id="sendPanel">
        <div class="send-to-label">Kirim ke: <span class="send-to-name" id="sendToName">—</span></div>
        <div class="dz" id="dz" onclick="document.getElementById('fi').click()"
             ondragover="dz_(event,'ov')" ondragleave="dz_(event,'out')" ondrop="dz_(event,'drop')">
          <span class="di">🗂️</span>
          <div class="dt">Pilih atau seret file</div>
          <div class="ds">Hingga 500 MB per file</div>
        </div>
        <input type="file" id="fi" multiple onchange="addF(this.files)">
        <div class="fl" id="fl"></div>
        <div class="btn-row">
          <button class="btn btn-b" id="btnSend" onclick="startSend()" disabled>📤 Kirim Sekarang</button>
          <button class="btn btn-sm" style="background:var(--s3);color:var(--mu);border:1px solid var(--bd)" onclick="cancelSend()">Batal</button>
        </div>
      </div>
    </div>

    <!-- Active transfers -->
    <div class="card" id="xferCard" style="display:none">
      <div class="members-title">📡 Transfer Aktif</div>
      <div class="xfer-list" id="xferList"></div>
    </div>

    <!-- Received files -->
    <div class="card" id="recvCard" style="display:none">
      <div class="recv-title">📥 File Diterima</div>
      <div id="recvList"></div>
    </div>

  </div><!-- end roomScreen -->
</div>

<div class="toast" id="toast"></div>

<script>
// ════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════
const WS_URL = location.protocol==='https:' ? 'wss://'+location.host : 'ws://'+location.host;
const ICE = [
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun2.l.google.com:19302'},
  {urls:'stun:stun3.l.google.com:19302'},
  {urls:'turn:a.relay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:a.relay.metered.ca:80?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:a.relay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:a.relay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
];
const CHUNK = 64*1024;
const COLORS = ['#5b8dee','#ee5b9b','#5beea0','#eeb85b','#c45bee','#ee8d5b','#5beee8','#ee5b5b'];

// ════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════
let ws=null, wsOk=false;
let myId=null, myName='', roomCode='';
let members={};       // {id:{name,color}}
let peers={};         // {id: RTCPeerConnection}
let dataChannels={};  // {id: RTCDataChannel}
let sendTarget=null;
let pendingFiles=[];
let recvBufs={}, recvMeta={};
let recvStats={};
let xferId=0;

// ════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════
const $=id=>document.getElementById(id);
function toast(msg,dur=3500){
  const el=$('toast'); el.textContent=msg; el.classList.add('on');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),dur);
}
function fB(b){
  if(!b||b<0)return '0B';
  if(b<1024)return b+'B';
  if(b<1048576)return (b/1024).toFixed(1)+'KB';
  if(b<1073741824)return (b/1048576).toFixed(2)+'MB';
  return (b/1073741824).toFixed(2)+'GB';
}
function fSpd(bps){return bps>0?fB(bps)+'/s':'—';}
function fEm(n){
  const m={pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📊',pptx:'📊',
    zip:'🗜',rar:'🗜',mp4:'🎬',mkv:'🎬',mp3:'🎵',wav:'🎵',
    jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',webp:'🖼',txt:'📃',apk:'📱'};
  return m[(n||'').split('.').pop().toLowerCase()]||'📁';
}
function initials(name){return (name||'?').slice(0,2).toUpperCase();}
function randColor(){return COLORS[Math.floor(Math.random()*COLORS.length)];}

// ════════════════════════════════════════════════
// JOIN / CREATE ROOM
// ════════════════════════════════════════════════
function createRoom(){
  const name=$('myName').value.trim();
  if(!name){toast('⚠️ Isi nama kamu dulu!');$('myName').focus();return;}
  myName=name;
  const code=String(Math.floor(100000+Math.random()*900000));
  enterRoom(code);
}

function joinRoom(){
  const name=$('myName').value.trim();
  const code=$('joinCode').value.trim();
  if(!name){toast('⚠️ Isi nama kamu dulu!');$('myName').focus();return;}
  if(code.length!==6){toast('⚠️ Masukkan kode room 6 digit.');$('joinCode').focus();return;}
  myName=name;
  enterRoom(code);
}

function enterRoom(code){
  roomCode=code;
  $('joinScreen').style.display='none';
  $('roomScreen').style.display='block';
  $('roomBadge').textContent=code;
  $('myNameDisplay').textContent=myName+' (kamu)';
  $('shareUrl').textContent=location.origin+'?room='+code;
  connectWS();
}

function leaveRoom(){
  if(ws){try{ws.close();}catch(e){}}
  Object.values(peers).forEach(pc=>{try{pc.close();}catch(e){}});
  peers={}; dataChannels={}; members={};
  $('joinScreen').style.display='block';
  $('roomScreen').style.display='none';
}

function shareRoom(){
  const box=$('shareBox');
  box.style.display=box.style.display==='none'?'flex':'none';
}

function copyRoomLink(){
  navigator.clipboard.writeText($('shareUrl').textContent).then(()=>toast('✅ Link room disalin!'));
}

// ════════════════════════════════════════════════
// WEBSOCKET
// ════════════════════════════════════════════════
function connectWS(){
  try{ ws=new WebSocket(WS_URL); }catch(e){ setWs('off'); return; }
  ws.onopen=()=>{
    wsOk=true; setWs('ok');
    wsSend({type:'join-room',room:roomCode,name:myName});
  };
  ws.onmessage=e=>{
    let msg; try{msg=JSON.parse(e.data);}catch{return;}
    handleWs(msg);
  };
  ws.onclose=()=>{ wsOk=false; setWs('off'); setTimeout(connectWS,4000); };
  ws.onerror=()=>{ wsOk=false; setWs('off'); };
}

function wsSend(obj){
  if(wsOk&&ws.readyState===1) ws.send(JSON.stringify(obj));
}

function setWs(state){
  const dot=$('wsDot'), lbl=$('wsLbl');
  dot.className='ws-dot '+(state==='ok'?'ok':state==='off'?'off':'spin');
  lbl.textContent=state==='ok'?'Terhubung ✓':state==='off'?'Terputus — mencoba ulang...':'Menghubungkan...';
}

async function handleWs(msg){
  const{type,from,data}=msg;

  // Server assigned us an ID
  if(type==='id'){ myId=msg.id; return; }

  // Full member list update
  if(type==='members'){
    members={};
    msg.members.forEach(m=>{ if(m.id!==myId) members[m.id]={name:m.name,color:m.color}; });
    renderMembers();
    $('memberCount').textContent=Object.keys(members).length+1+' member';
    return;
  }

  // Member joined
  if(type==='member-joined'){
    members[msg.id]={name:msg.name,color:msg.color};
    renderMembers();
    $('memberCount').textContent=Object.keys(members).length+1+' member';
    toast('👋 '+msg.name+' bergabung!');
    return;
  }

  // Member left
  if(type==='member-left'){
    const name=members[msg.id]?.name||'Someone';
    delete members[msg.id];
    if(peers[msg.id]){try{peers[msg.id].close();}catch(e){} delete peers[msg.id];}
    delete dataChannels[msg.id];
    renderMembers();
    $('memberCount').textContent=Object.keys(members).length+1+' member';
    toast('👋 '+name+' keluar.');
    return;
  }

  // WebRTC signaling relay
  if(type==='offer'){ await handleOffer(from,data); return; }
  if(type==='answer'){ await handleAnswer(from,data); return; }
  if(type==='ice'){ await handleIce(from,data); return; }
}

// ════════════════════════════════════════════════
// MEMBERS UI
// ════════════════════════════════════════════════
function renderMembers(){
  const el=$('membersList');
  if(!Object.keys(members).length){
    el.innerHTML='<div class="no-members">Belum ada member lain — bagikan kode room!</div>';
    return;
  }
  el.innerHTML='';
  Object.entries(members).forEach(([id,m])=>{
    const div=document.createElement('div'); div.className='member';
    div.innerHTML=\`
      <div class="member-left">
        <div class="member-avatar" style="background:\${m.color}22;color:\${m.color}">\${initials(m.name)}</div>
        <div>
          <div class="member-name">\${m.name}</div>
          <div class="member-tag">Online</div>
        </div>
      </div>
      <button class="btn-send-to" onclick="selectTarget('\${id}','\${m.name}')">📤 Kirim</button>
    \`;
    el.appendChild(div);
  });
}

// ════════════════════════════════════════════════
// SEND FLOW
// ════════════════════════════════════════════════
function selectTarget(id, name){
  sendTarget=id;
  $('sendToName').textContent=name;
  $('sendPanel').classList.add('on');
  pendingFiles=[];
  renderFL();
  $('btnSend').disabled=true;
  // Always pre-connect WebRTC (reinit if broken)
  const existing=peers[id];
  const dc=dataChannels[id];
  const needsInit=!existing||existing.connectionState==='failed'||existing.connectionState==='closed'
    ||!dc||dc.readyState==='closed';
  if(needsInit){
    if(existing){try{existing.close();}catch(e){}}
    delete peers[id]; delete dataChannels[id];
    initPeer(id,true);
  }
}

function cancelSend(){
  sendTarget=null; pendingFiles=[];
  $('sendPanel').classList.remove('on');
  $('fl').innerHTML='';
}

function dz_(e,t){
  e.preventDefault(); $('dz').classList.toggle('ov',t==='ov');
  if(t==='drop'){$('dz').classList.remove('ov');addF(e.dataTransfer.files);}
}
function addF(fl){
  Array.from(fl).forEach(f=>pendingFiles.push(f));
  renderFL(); $('btnSend').disabled=!pendingFiles.length;
}
function removeF(i){pendingFiles.splice(i,1);renderFL();$('btnSend').disabled=!pendingFiles.length;}
function renderFL(){
  const el=$('fl'); el.innerHTML='';
  pendingFiles.forEach((f,i)=>{
    const isI=f.type.startsWith('image/');
    const d=document.createElement('div'); d.className='fitem';
    const th=document.createElement('div'); th.className='fth';
    if(isI){const img=document.createElement('img');img.src=URL.createObjectURL(f);th.appendChild(img);}
    else th.textContent=fEm(f.name);
    d.appendChild(th);
    const mt=document.createElement('div'); mt.className='fm';
    mt.innerHTML=\`<div class="fn">\${f.name}</div><div class="fs2">\${fB(f.size)}</div>\`;
    d.appendChild(mt);
    const rm=document.createElement('button'); rm.className='frm';
    rm.textContent='✕'; rm.onclick=()=>removeF(i); d.appendChild(rm);
    el.appendChild(d);
  });
}

async function startSend(){
  if(!pendingFiles.length||!sendTarget) return;
  const targetId=sendTarget;
  const files=[...pendingFiles];
  cancelSend();

  // Always get fresh connection
  let dc=dataChannels[targetId];
  if(!dc||dc.readyState!=='open'){
    toast('🔄 Menghubungkan ke peer...');
    // Reset broken peer first
    const existing=peers[targetId];
    if(existing&&(existing.connectionState==='failed'||existing.connectionState==='closed'||!dc||dc.readyState!=='open')){
      resetPeer(targetId);
      initPeer(targetId,true);
    }
    dc=await waitForDC(targetId);
    if(!dc){
      toast('❌ Gagal terhubung. Coba klik Kirim lagi.',4000);
      resetPeer(targetId);
      return;
    }
  }

  // Show xfer card
  $('xferCard').style.display='block';
  const xl=$('xferList');

  // Send metadata
  dc.send(JSON.stringify({type:'meta',files:files.map((f,i)=>({idx:i,name:f.name,size:f.size,type:f.type})),
    from:myName}));

  for(let i=0;i<files.length;i++){
    const xid='s-'+targetId+'-'+i;
    xl.innerHTML+=mkXI(xid, files[i].name, files[i].size,
      '→ '+( members[targetId]?.name||'?'));
    await sendOne(dc, files[i], i, xid);
  }
  toast('🎉 Semua file terkirim ke '+(members[targetId]?.name||'?')+'!',4000);
  // Reset peer so next transfer works fresh
  setTimeout(()=>resetPeer(targetId), 2000);
}

function resetPeer(id){
  const pc=peers[id];
  if(pc){try{pc.close();}catch(e){}}
  delete peers[id];
  delete dataChannels[id];
}

function waitForDC(targetId){
  return new Promise(resolve=>{
    const t=setTimeout(()=>resolve(null),25000);
    function check(){
      const dc=dataChannels[targetId];
      if(dc&&dc.readyState==='open'){clearTimeout(t);resolve(dc);}
      else setTimeout(check,300);
    }
    check();
  });
}

function sendOne(dc, file, idx, xid){
  return new Promise((res,rej)=>{
    const total=file.size, t0=Date.now(); let off=0;
    if(total===0){
      dc.send(JSON.stringify({type:'done',idx,name:file.name}));
      updXI(xid,0,0,t0); res(); return;
    }
    function next(){
      if(dc.bufferedAmount>256*1024){setTimeout(next,15);return;}
      file.slice(off,off+CHUNK).arrayBuffer().then(buf=>{
        dc.send(JSON.stringify({type:'chunk',idx,off,total,len:buf.byteLength}));
        dc.send(buf);
        off+=buf.byteLength; updXI(xid,off,total,t0);
        if(off<total) setTimeout(next,0);
        else{ dc.send(JSON.stringify({type:'done',idx,name:file.name})); res(); }
      }).catch(rej);
    }
    next();
  });
}

// ════════════════════════════════════════════════
// WebRTC — peer per member
// ════════════════════════════════════════════════
function initPeer(targetId, isInitiator){
  const pc=new RTCPeerConnection({iceServers:ICE});
  peers[targetId]=pc;

  pc.onicecandidate=e=>{
    if(e.candidate) wsSend({type:'ice',to:targetId,room:roomCode,data:e.candidate});
  };

  pc.onconnectionstatechange=()=>{
    if(pc.connectionState==='failed'||pc.connectionState==='disconnected'){
      delete peers[targetId]; delete dataChannels[targetId];
    }
  };

  if(isInitiator){
    const dc=pc.createDataChannel('fd',{ordered:true});
    dc.binaryType='arraybuffer';
    setupDC(dc, targetId);
    dataChannels[targetId]=dc;
    // Create offer — use trickle ICE for faster connection
    pc.createOffer().then(offer=>pc.setLocalDescription(offer))
      .then(()=>{
        // Send offer immediately, ICE candidates sent via onicecandidate
        wsSend({type:'offer',to:targetId,room:roomCode,
          data:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
      }).catch(e=>console.warn('createOffer error:',e));
  } else {
    pc.ondatachannel=e=>{
      const dc=e.channel; dc.binaryType='arraybuffer';
      setupDC(dc,targetId);
      dataChannels[targetId]=dc;
    };
  }
  return pc;
}

function setupDC(dc, fromId){
  let pendingHdr=null;
  dc.onopen=()=>{ console.log('DC open with',members[fromId]?.name||fromId); };
  dc.onclose=()=>{
    console.log('DC closed with',members[fromId]?.name||fromId);
    // Clean up so next send re-initiates
    if(dataChannels[fromId]===dc){
      delete dataChannels[fromId];
      const pc=peers[fromId];
      if(pc&&(pc.connectionState==='closed'||pc.connectionState==='failed')){
        delete peers[fromId];
      }
    }
  };
  dc.onerror=e=>{ console.warn('DC error',e); };
  dc.onmessage=e=>{
    if(typeof e.data==='string'){
      const msg=JSON.parse(e.data);
      if(msg.type==='meta') initRecv(msg, fromId);
      else if(msg.type==='chunk') pendingHdr=msg;
      else if(msg.type==='done') finishRecv(msg, fromId);
    } else {
      if(pendingHdr){ addChunk(pendingHdr,e.data,fromId); pendingHdr=null; }
    }
  };
}

async function handleOffer(fromId, sdp){
  // Always create fresh peer for incoming offer
  let pc=peers[fromId];
  if(pc&&(pc.signalingState!=='stable'||pc.connectionState==='failed'||pc.connectionState==='closed')){
    try{pc.close();}catch(e){}
    delete peers[fromId]; delete dataChannels[fromId]; pc=null;
  }
  if(!pc) pc=initPeer(fromId, false);
  try{ await pc.setRemoteDescription(new RTCSessionDescription(sdp)); }
  catch(e){ console.warn('setRemoteDesc error:',e); resetPeer(fromId); return; }
  const answer=await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // Send answer immediately (trickle ICE)
  wsSend({type:'answer',to:fromId,room:roomCode,
    data:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
}

async function handleAnswer(fromId, sdp){
  const pc=peers[fromId]; if(!pc) return;
  if(pc.signalingState==='have-local-offer'){
    try{ await pc.setRemoteDescription(new RTCSessionDescription(sdp)); }
    catch(e){ console.warn('setRemoteDesc answer error:',e); }
  }
}

async function handleIce(fromId, candidate){
  const pc=peers[fromId]; if(!pc) return;
  try{ await pc.addIceCandidate(new RTCIceCandidate(candidate)); }catch(_){}
}

function gatherICE(pc){
  return new Promise(resolve=>{
    if(pc.iceGatheringState==='complete'){resolve();return;}
    const done=()=>resolve();
    const prev1=pc.onicegatheringstatechange;
    pc.onicegatheringstatechange=()=>{ if(prev1)prev1(); if(pc.iceGatheringState==='complete')done(); };
    const prev2=pc.onicecandidate;
    pc.onicecandidate=e=>{ if(prev2)prev2(e); if(!e.candidate)done(); };
    setTimeout(done,5000);
  });
}

// ════════════════════════════════════════════════
// RECEIVE
// ════════════════════════════════════════════════
function initRecv(msg, fromId){
  const fromName=members[fromId]?.name||'?';
  $('xferCard').style.display='block';
  const xl=$('xferList');
  msg.files.forEach(f=>{
    const key=fromId+'-'+f.idx;
    recvBufs[key]=[]; recvMeta[key]={...f,fromId,fromName};
    recvStats[key]={t0:Date.now(),recv:0};
    const xid='r-'+key;
    xl.innerHTML+=mkXI(xid, f.name, f.size, '← '+fromName);
  });
  toast('📥 '+(members[fromId]?.name||'?')+' mengirim '+msg.files.length+' file...');
}

function addChunk(hdr, data, fromId){
  const key=fromId+'-'+hdr.idx;
  if(!recvBufs[key]) recvBufs[key]=[];
  recvBufs[key].push(data);
  if(!recvStats[key]) recvStats[key]={t0:Date.now(),recv:0};
  recvStats[key].recv+=data.byteLength||0;
  updXI('r-'+key, recvStats[key].recv, hdr.total, recvStats[key].t0);
}

function finishRecv(msg, fromId){
  const key=fromId+'-'+msg.idx;
  const meta=recvMeta[key]; if(!meta) return;
  const blob=new Blob(recvBufs[key],{type:meta.type||'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  updXI('r-'+key, meta.size, meta.size, recvStats[key]?.t0||Date.now());

  $('recvCard').style.display='block';
  const rl=$('recvList');
  const isI=(meta.type||'').startsWith('image/');
  const item=document.createElement('div'); item.className='ri';
  const th=document.createElement('div'); th.className='fth';
  if(isI){const img=document.createElement('img');img.src=url;th.appendChild(img);}
  else th.textContent=fEm(meta.name);
  item.appendChild(th);
  item.innerHTML+=\`<div class="fm" style="flex:1;min-width:0">
    <div class="fn">\${meta.name}</div>
    <div class="fs2">\${fB(meta.size)} · dari \${meta.fromName}</div>
  </div>
  <a class="dl" href="\${url}" download="\${meta.name}">⬇ Unduh</a>\`;
  rl.appendChild(item);
  toast('✅ '+meta.name+' dari '+meta.fromName+' siap didownload!');
  recvBufs[key]=[];
}

// ════════════════════════════════════════════════
// PROGRESS UI
// ════════════════════════════════════════════════
function mkXI(xid, name, total, who){
  return \`<div class="xi" id="xi\${xid}">
    <div class="xi-who">\${who}</div>
    <div class="xi-header">
      <div class="xi-name">\${name}</div>
      <div class="xi-pct" id="xp\${xid}">0%</div>
    </div>
    <div class="bar"><div class="fill" id="xb\${xid}"></div></div>
    <div class="bg">
      <div class="bc"><div class="bl">Bytes</div><div class="bv c1" id="xd\${xid}">0B</div></div>
      <div class="bc"><div class="bl">Total</div><div class="bv" id="xt\${xid}">\${fB(total)}</div></div>
      <div class="bc"><div class="bl">Speed</div><div class="bv c3" id="xs\${xid}">—</div></div>
    </div>
  </div>\`;
}

function updXI(xid, done, total, t0){
  const pct=total>0?Math.min(100,Math.round(done/total*100)):0;
  const bps=(Date.now()-t0)>200?done/((Date.now()-t0)/1000):0;
  const b=$('xb'+xid),p=$('xp'+xid),d=$('xd'+xid),s=$('xs'+xid);
  if(b){b.style.width=pct+'%';if(pct>=100)b.classList.add('done');}
  if(p){p.textContent=pct+'%';if(pct>=100)p.classList.add('green');}
  if(d) d.textContent=fB(done);
  if(s) s.textContent=fSpd(bps);
}

// ════════════════════════════════════════════════
// AUTO JOIN FROM URL
// ════════════════════════════════════════════════
window.addEventListener('load',()=>{
  const p=new URLSearchParams(location.search);
  const room=p.get('room');
  if(room&&/^\\d{6}$/.test(room)){
    $('joinCode').value=room;
    toast('💡 Kode room sudah diisi. Isi nama lalu klik Masuk!');
  }
});
</script>
</body>
</html>`;

// ── WebSocket Signaling Server ───────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

const wss = new WebSocketServer({ server });

// rooms: { roomCode: Map<id, {ws, name, color}> }
const rooms = new Map();
const COLORS = ['#5b8dee','#ee5b9b','#5beea0','#eeb85b','#c45bee','#ee8d5b','#5beee8','#ee5b5b'];
let uidCounter = 0;

function uid() { return 'u' + (++uidCounter) + Date.now(); }
function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function safeSend(ws, obj) {
  try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch(_) {}
}

wss.on('connection', (ws) => {
  let myId = uid();
  let myRoom = null;
  let myName = '';
  let myColor = randColor();

  // Send assigned ID
  safeSend(ws, { type: 'id', id: myId });

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    const { type, room, name, to, data } = msg;

    // ── JOIN ROOM ──
    if (type === 'join-room') {
      myRoom = room;
      myName = name || 'Anonymous';

      if (!rooms.has(room)) rooms.set(room, new Map());
      const rm = rooms.get(room);

      // Send existing members to new joiner
      const memberList = [];
      rm.forEach((m, id) => memberList.push({ id, name: m.name, color: m.color }));
      safeSend(ws, { type: 'members', members: memberList });

      // Notify existing members
      rm.forEach(m => safeSend(m.ws, { type: 'member-joined', id: myId, name: myName, color: myColor }));

      // Add self
      rm.set(myId, { ws, name: myName, color: myColor });

      console.log(`[${room}] ${myName} joined. Members: ${rm.size}`);
      return;
    }

    // ── RELAY: offer / answer / ice ──
    if (['offer','answer','ice'].includes(type)) {
      if (!myRoom || !rooms.has(myRoom)) return;
      const rm = rooms.get(myRoom);
      const target = rm.get(to);
      if (target) safeSend(target.ws, { type, from: myId, data });
      return;
    }
  });

  ws.on('close', () => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const rm = rooms.get(myRoom);
    rm.delete(myId);
    rm.forEach(m => safeSend(m.ws, { type: 'member-left', id: myId }));
    if (rm.size === 0) {
      rooms.delete(myRoom);
      console.log(`Room ${myRoom} removed.`);
    }
    console.log(`[${myRoom}] ${myName} left. Members: ${rm.size}`);
  });

  ws.on('error', () => {});
});

server.listen(PORT, () => {
  console.log(`FileDrop Group Server on port ${PORT}`);
});
