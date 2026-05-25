
import { useState, useEffect, useRef } from "react";

// ─── THEME ───────────────────────────────────────────────────
const C = {
  bg:"#0a0008", surface:"#110012", card:"#160018", border:"#3d0045",
  borderGlow:"#7b00ff", primary:"#c800ff", primaryDim:"#7b00ff33",
  accent:"#ff2d6b", accentDim:"#ff2d6b33", text:"#e8d0ff",
  muted:"#7a5a8a", dim:"#3d1f4d", green:"#00ff88", yellow:"#ffcc00", red:"#ff2d55",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&family=Rajdhani:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes flicker{0%,94%,100%{opacity:1}95%{opacity:0.3}97%{opacity:1}99%{opacity:0.5}}
@keyframes pulse{0%,100%{box-shadow:0 0 8px #bf00ff,0 0 24px #bf00ff44}50%{box-shadow:0 0 18px #bf00ff,0 0 48px #bf00ff88}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes gridMove{0%{background-position:0 0}100%{background-position:40px 40px}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes modalIn{from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
input::placeholder,textarea::placeholder{color:#3d1f4d;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#0a0008;}
::-webkit-scrollbar-thumb{background:#7b00ff44;border-radius:2px;}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);}
.modal-box{background:#110012;border:1px solid #7b00ff;border-radius:14px;padding:20px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;animation:modalIn 0.3s ease;}
.copy-btn{cursor:pointer;padding:4px 10px;background:#7b00ff33;border:1px solid #7b00ff44;border-radius:4px;color:#c800ff;font-family:'Share Tech Mono';font-size:9px;transition:all 0.2s;white-space:nowrap;}
.copy-btn:hover{background:#7b00ff55;}
.copy-btn:active{transform:scale(0.95);}
.shake{animation:shake 0.4s ease;}
.msg-bubble{animation:slideIn 0.2s ease;}
`;

// ════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIG — GANTI DENGAN CONFIG KAMU
// Setelah dapat config dari Firebase Console, paste di sini
// ════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "PASTE_API_KEY_KAMU",
  authDomain:        "PASTE_AUTH_DOMAIN_KAMU",
  databaseURL:       "PASTE_DATABASE_URL_KAMU",
  projectId:         "PASTE_PROJECT_ID_KAMU",
  storageBucket:     "PASTE_STORAGE_BUCKET_KAMU",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID_KAMU",
  appId:             "PASTE_APP_ID_KAMU",
};
// ════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────
const WALLETS = {
  SOL: "6EGmNvaJ3V7wJZsCWu8tKfr1aSXK3A9MR5KtCQoBZjD8",
  BNB: "0x32C950CC0E9869a426Cd99CdD1636c2255D7F113",
};
const NOTIFY_EMAIL = "dwiandikayulianto3078@gmail.com";
const ADMIN_PASS   = "kingdegen2025";

// ─── FIREBASE HELPERS ────────────────────────────────────────
// Menggunakan Firebase CDN via dynamic import
let db = null;
let firebaseReady = false;

async function initFirebase() {
  if (firebaseReady) return db;
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getDatabase, ref, push, onValue, set, update, serverTimestamp, query, orderByChild, limitToLast }
      = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    firebaseReady = true;

    // Export helpers ke global scope agar bisa dipakai di fungsi lain
    window._fb = { ref, push, onValue, set, update, serverTimestamp, query, orderByChild, limitToLast, db };
    return db;
  } catch(e) {
    console.error("Firebase init error:", e);
    return null;
  }
}

// Generate session ID untuk user (simpan di localStorage)
function getSessionId() {
  let id = localStorage.getItem("kd_session");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2,10) + "_" + Date.now();
    localStorage.setItem("kd_session", id);
  }
  return id;
}

function getUserName() {
  return localStorage.getItem("kd_username") || "";
}

// ─── HELPERS ─────────────────────────────────────────────────
const scoreColor  = s => s>=75?C.green:s>=45?C.yellow:C.red;
const labelColor  = l => l==="SAFU"?C.green:l==="CAUTION"?C.yellow:C.red;
const fmt         = n => n>=1e9?(n/1e9).toFixed(1)+"B":n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":n?.toString()||"0";
const timeStr     = ts => {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("id-ID", {hour:"2-digit",minute:"2-digit"});
};
const dateStr = ts => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("id-ID", {day:"numeric",month:"short"});
};

// ─── ACTIVATION ──────────────────────────────────────────────
function generateActivationCode(plan) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return `${plan}-${seg()}-${seg()}`;
}
const STORAGE_KEY = "kd_activation";
function getStoredActivation() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); } catch(e){ return null; }
}
function saveActivation(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e){} 
}

// ─── SCORE ───────────────────────────────────────────────────
function computeScore(gp) {
  if(!gp) return 50;
  let s=100;
  if(gp.honeypot) s-=40;
  if(!gp.verified) s-=15;
  if(!gp.renounced) s-=10;
  if(gp.mint) s-=15;
  if(gp.proxy) s-=5;
  if(gp.sell_tax>10) s-=10; else if(gp.sell_tax>5) s-=5;
  if(gp.dev_wallet>10) s-=10; else if(gp.dev_wallet>5) s-=5;
  if(!gp.lp_locked) s-=10;
  return Math.max(0,Math.min(100,s));
}
const computeLabel = s => s>=75?"SAFU":s>=45?"CAUTION":"DANGER";

// ─── API ─────────────────────────────────────────────────────
async function fetchGoPlus(ca, chainId) {
  try {
    const url = chainId==="solana"
      ? `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${ca}`
      : `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${ca}`;
    const res  = await fetch(url);
    const json = await res.json();
    const d    = json?.result?.[ca.toLowerCase()]||json?.result?.[ca];
    if(!d) return null;
    return {
      verified:  d.is_open_source==="1",
      renounced: !d.owner_address||d.owner_address==="0x0000000000000000000000000000000000000000",
      mint:      d.can_take_back_ownership==="1"||d.owner_change_balance==="1",
      honeypot:  d.is_honeypot==="1",
      buy_tax:   parseFloat(d.buy_tax||0)*100,
      sell_tax:  parseFloat(d.sell_tax||0)*100,
      proxy:     d.is_proxy==="1",
      holders:   parseInt(d.holder_count||0),
      lp_locked: parseInt(d.lp_holder_count||0)>0,
      dev_wallet:parseFloat(d.creator_percent||0)*100,
    };
  } catch(e){ return null; }
}

async function fetchDexScreener(ca) {
  try {
    const res  = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const json = await res.json();
    const pair = json?.pairs?.[0];
    if(!pair) return null;
    return {
      name:          pair.baseToken?.name||"Unknown",
      ticker:        pair.baseToken?.symbol||"???",
      network:       pair.chainId||"unknown",
      price:         pair.priceUsd||"0",
      lp_size:       "$"+parseFloat(pair.liquidity?.usd||0).toLocaleString(),
      tx24h:         (pair.txns?.h24?.buys||0)+(pair.txns?.h24?.sells||0),
      volume24h:     "$"+parseFloat(pair.volume?.h24||0).toLocaleString(),
      mcap:          pair.marketCap?"$"+fmt(pair.marketCap):"—",
      age:           pair.pairCreatedAt?Math.floor((Date.now()-pair.pairCreatedAt)/86400000)+" days":"unknown",
      dexUrl:        pair.url||"#",
      priceChange24h:pair.priceChange?.h24||0,
    };
  } catch(e){ return null; }
}

const CHAIN_LABELS = {solana:"SOL",ethereum:"ETH",bsc:"BSC",base:"BASE",arbitrum:"ARB",polygon:"MATIC"};
const CHAIN_COLORS = {solana:"#9945ff",ethereum:"#627eea",bsc:"#f0b90b",base:"#0052ff",arbitrum:"#12aaff",polygon:"#8247e5"};

async function fetchTrending() {
  try {
    const res  = await fetch("https://api.dexscreener.com/token-boosts/top/v1");
    const json = await res.json();
    return (json||[]).slice(0,10).map(t=>({
      ca: t.tokenAddress, name: t.description||t.tokenAddress.slice(0,8)+"...",
      ticker: t.tokenAddress.slice(0,4).toUpperCase(), icon: t.icon||null,
      url: t.url||"#", chain: t.chainId||"unknown",
      chainLabel: CHAIN_LABELS[t.chainId]||t.chainId?.toUpperCase()||"?",
      chainColor: CHAIN_COLORS[t.chainId]||"#888",
    }));
  } catch(e){ return []; }
}

const RSS_PROXIES = [
  {name:"Cointelegraph", proxy:"https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss"},
  {name:"Decrypt",       proxy:"https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed"},
  {name:"CoinDesk",      proxy:"https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F"},
];
function guessSentiment(t="") {
  const tl = t.toLowerCase();
  if(["surge","soar","rally","bull","ath","pump","rise","green","launch","adoption","approve"].some(w=>tl.includes(w))) return "bullish";
  if(["crash","drop","fall","bear","dump","hack","scam","rug","ban","decline","loss","warning","exploit"].some(w=>tl.includes(w))) return "bearish";
  return "neutral";
}
function timeAgo(d) {
  try {
    const s=(Date.now()-new Date(d).getTime())/1000;
    if(s<3600) return Math.floor(s/60)+"m ago";
    if(s<86400) return Math.floor(s/3600)+"h ago";
    return Math.floor(s/86400)+"d ago";
  } catch(e){ return ""; }
}
async function fetchNews() {
  const out=[];
  for(const src of RSS_PROXIES){
    try{
      const r=await fetch(src.proxy);
      const j=await r.json();
      if(j.status==="ok"&&j.items?.length){
        j.items.slice(0,5).forEach(item=>out.push({
          title:item.title||"", link:item.link||"#",
          time:timeAgo(item.pubDate), source:src.name,
          sentiment:guessSentiment(item.title),
        }));
      }
    }catch(e){}
  }
  return out.slice(0,20);
}

// ─── UI COMPONENTS ───────────────────────────────────────────
const Row = ({label,val,bool,invert,warn}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.card,borderRadius:"6px",border:`1px solid ${C.border}`}}>
    <span style={{fontSize:"13px",color:C.muted,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}>{label}</span>
    {bool
      ?<span style={{fontFamily:"'Share Tech Mono'",fontSize:"11px",color:invert?(val?C.red:C.green):(val?C.green:C.red)}}>{val?(invert?"⚠ YES":"✓ YES"):(invert?"✓ NO":"✗ NO")}</span>
      :<span style={{fontFamily:"'Share Tech Mono'",fontSize:"11px",color:warn?C.yellow:C.primary}}>{val}</span>
    }
  </div>
);

const QRCode = ({value,size=150}) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=110012&color=c800ff&margin=8`}
    alt="QR" style={{width:size,height:size,borderRadius:"8px",border:`1px solid ${C.border}`}} onError={e=>e.target.style.display="none"}/>
);

// ════════════════════════════════════════════════════════════
// 💬 USER CHAT TAB
// ════════════════════════════════════════════════════════════
function ChatTab() {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [name,       setName]       = useState(getUserName());
  const [nameSet,    setNameSet]    = useState(!!getUserName());
  const [sending,    setSending]    = useState(false);
  const [fbReady,    setFbReady]    = useState(false);
  const [fbError,    setFbError]    = useState(false);
  const sessionId = getSessionId();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(()=>{
    initFirebase().then(database => {
      if (!database) { setFbError(true); return; }
      setFbReady(true);
      const { ref, onValue, query, orderByChild, limitToLast } = window._fb;
      // Listen ke pesan di session ini
      const msgsRef = query(
        ref(database, `chats/${sessionId}/messages`),
        orderByChild("ts"),
        limitToLast(50)
      );
      onValue(msgsRef, snap => {
        const data = snap.val();
        if (!data) return;
        const list = Object.entries(data).map(([id,v])=>({id,...v}));
        list.sort((a,b)=>a.ts-b.ts);
        setMessages(list);
      });
    });
  }, []);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const saveName = () => {
    if (!name.trim()) return;
    localStorage.setItem("kd_username", name.trim());
    setNameSet(true);
    // Simpan info user ke Firebase
    if (window._fb) {
      const { ref, set } = window._fb;
      set(ref(window._fb.db, `chats/${sessionId}/info`), {
        name: name.trim(), sessionId,
        lastActive: Date.now(), plan: getStoredActivation()?.plan || "FREE",
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !fbReady || sending) return;
    setSending(true);
    try {
      const { ref, push, set } = window._fb;
      const msgData = {
        text: input.trim(),
        sender: "user",
        senderName: name || "User",
        ts: Date.now(),
        read: false,
      };
      await push(ref(window._fb.db, `chats/${sessionId}/messages`), msgData);
      // Update last message preview di session info
      await set(ref(window._fb.db, `chats/${sessionId}/info`), {
        name: name || "User", sessionId,
        lastMsg: input.trim().slice(0,60),
        lastActive: Date.now(),
        plan: getStoredActivation()?.plan || "FREE",
        unread: true,
      });
      setInput("");
    } catch(e) { console.error(e); }
    setSending(false);
    setTimeout(()=>inputRef.current?.focus(), 100);
  };

  // ── Error state ──
  if (fbError) return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{padding:"24px",background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:"12px",textAlign:"center"}}>
        <div style={{fontSize:"32px",marginBottom:"12px"}}>⚠️</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:"18px",color:C.red,letterSpacing:"2px",marginBottom:"8px"}}>FIREBASE BELUM DIKONFIGURASI</div>
        <div style={{fontSize:"11px",color:C.muted,fontFamily:"'Share Tech Mono'",lineHeight:1.8}}>
          Paste Firebase config kamu di file<br/>
          <span style={{color:C.primary}}>KingDegen.jsx</span> bagian<br/>
          <span style={{color:C.yellow}}>FIREBASE_CONFIG</span><br/><br/>
          Ikuti panduan setup yang dikirim bersama file ini.
        </div>
      </div>
    </div>
  );

  // ── Set nama dulu ──
  if (!nameSet) return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{textAlign:"center",padding:"30px 0 20px"}}>
        <div style={{fontSize:"36px",marginBottom:"10px"}}>💬</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:"22px",color:C.primary,letterSpacing:"3px",marginBottom:"6px"}}>CHAT DENGAN ADMIN</div>
        <div style={{fontSize:"11px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>Tanya apa aja soal KingDegen</div>
      </div>
      <div style={{padding:"16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"12px"}}>
        <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"8px"}}>SIAPA NAMA KAMU?</div>
        <input
          value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&saveName()}
          placeholder="Masukkan nama kamu..."
          style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"12px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"13px",outline:"none",marginBottom:"12px"}}
          onFocus={e=>e.target.style.border=`1px solid ${C.primary}`}
          onBlur={e=>e.target.style.border=`1px solid ${C.border}`}
          autoFocus
        />
        <button onClick={saveName} disabled={!name.trim()}
          style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"3px",cursor:name.trim()?"pointer":"not-allowed",opacity:name.trim()?1:0.5,animation:"pulse 2s infinite"}}>
          MULAI CHAT →
        </button>
      </div>
    </div>
  );

  // ── Chat UI ──
  return (
    <div style={{animation:"fadeUp 0.3s ease",display:"flex",flexDirection:"column",height:"calc(100vh - 160px)",minHeight:"400px"}}>
      {/* Header */}
      <div style={{padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>👑</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:"16px",color:"#fff",letterSpacing:"2px"}}>KINGDEGEN ADMIN</div>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:C.green,animation:"blink 2s infinite"}}/>
            <span style={{fontSize:"9px",color:C.green,fontFamily:"'Share Tech Mono'"}}>ONLINE · Balas secepatnya</span>
          </div>
        </div>
        <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",textAlign:"right"}}>
          <div style={{color:C.primary}}>{name}</div>
          <div style={{cursor:"pointer",marginTop:"2px",opacity:0.6}} onClick={()=>{localStorage.removeItem("kd_username");setNameSet(false);}}>ganti nama</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"8px",paddingBottom:"8px"}}>
        {/* Welcome message */}
        <div style={{display:"flex",justifyContent:"flex-start"}}>
          <div style={{maxWidth:"80%",padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"12px 12px 12px 2px"}}>
            <div style={{fontSize:"12px",color:C.text,fontFamily:"'Rajdhani',sans-serif",fontWeight:600,lineHeight:1.5}}>
              Halo {name}! 👋 Selamat datang di KingDegen.<br/>Ada yang bisa aku bantu?
            </div>
            <div style={{fontSize:"8px",color:C.dim,fontFamily:"'Share Tech Mono'",marginTop:"4px"}}>Admin · Otomatis</div>
          </div>
        </div>

        {messages.map(msg=>(
          <div key={msg.id} className="msg-bubble" style={{display:"flex",justifyContent:msg.sender==="user"?"flex-end":"flex-start"}}>
            <div style={{
              maxWidth:"80%",padding:"10px 14px",
              background:msg.sender==="user"?C.primaryDim:C.surface,
              border:`1px solid ${msg.sender==="user"?C.borderGlow:C.border}`,
              borderRadius:msg.sender==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",
            }}>
              <div style={{fontSize:"12px",color:C.text,fontFamily:"'Rajdhani',sans-serif",fontWeight:600,lineHeight:1.5,wordBreak:"break-word"}}>
                {msg.text}
              </div>
              <div style={{fontSize:"8px",color:C.dim,fontFamily:"'Share Tech Mono'",marginTop:"4px",textAlign:msg.sender==="user"?"right":"left"}}>
                {msg.sender==="user"?name:"Admin"} · {timeStr(msg.ts)}
                {msg.sender==="user"&&<span style={{marginLeft:"4px",color:msg.read?C.green:C.dim}}>{msg.read?"✓✓":"✓"}</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{display:"flex",gap:"8px",paddingTop:"8px",borderTop:`1px solid ${C.border}`}}>
        <input
          ref={inputRef}
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
          placeholder="Ketik pesan..."
          style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"11px 14px",color:C.primary,fontFamily:"'Rajdhani',sans-serif",fontSize:"13px",fontWeight:600,outline:"none"}}
          onFocus={e=>e.target.style.border=`1px solid ${C.primary}`}
          onBlur={e=>e.target.style.border=`1px solid ${C.border}`}
        />
        <button onClick={sendMessage} disabled={!input.trim()||sending}
          style={{padding:"11px 16px",background:input.trim()?`linear-gradient(135deg,${C.primary},${C.accent})`:"transparent",border:input.trim()?"none":`1px solid ${C.border}`,borderRadius:"8px",color:input.trim()?"#fff":C.muted,fontFamily:"'Bebas Neue'",fontSize:"16px",cursor:input.trim()?"pointer":"not-allowed",transition:"all 0.2s",flexShrink:0}}>
          {sending?"⟳":"➤"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 🔧 ADMIN PANEL MODAL — Chat management + Code management
// ════════════════════════════════════════════════════════════
function AdminPanel({onClose}) {
  const [pass,       setPass]       = useState("");
  const [authed,     setAuthed]     = useState(false);
  const [passErr,    setPassErr]    = useState(false);
  const [shaking,    setShaking]    = useState(false);
  const [adminTab,   setAdminTab]   = useState("CHAT"); // "CHAT" | "CODES" | "ORDERS"
  const [sessions,   setSessions]   = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMsgs,   setChatMsgs]   = useState([]);
  const [reply,      setReply]      = useState("");
  const [sending,    setSending]    = useState(false);
  const [fbReady,    setFbReady]    = useState(false);
  const [plan,       setPlan]       = useState("DEGEN");
  const [generated,  setGenerated]  = useState([]);
  const [copied2,    setCopied2]    = useState({});
  const bottomRef2 = useRef(null);

  const handleLogin = () => {
    if(pass===ADMIN_PASS){
      setAuthed(true);
      initFirebase().then(db => {
        if (db) { setFbReady(true); loadSessions(); }
      });
      loadCodes();
    } else {
      setPassErr(true); setShaking(true); setTimeout(()=>setShaking(false),400);
    }
  };

  // ── Load all chat sessions ──
  const loadSessions = () => {
    if (!window._fb) return;
    const { ref, onValue } = window._fb;
    onValue(ref(window._fb.db, "chats"), snap => {
      const data = snap.val();
      if (!data) { setSessions([]); return; }
      const list = Object.entries(data).map(([id, v]) => ({
        sessionId: id,
        name: v.info?.name || "Unknown",
        lastMsg: v.info?.lastMsg || "",
        lastActive: v.info?.lastActive || 0,
        plan: v.info?.plan || "FREE",
        unread: v.info?.unread || false,
        msgCount: v.messages ? Object.keys(v.messages).length : 0,
      }));
      list.sort((a,b) => b.lastActive - a.lastActive);
      setSessions(list);
    });
  };

  // ── Open specific chat ──
  const openChat = (session) => {
    setActiveChat(session);
    setChatMsgs([]);
    if (!window._fb) return;
    const { ref, onValue, update } = window._fb;
    // Mark as read
    update(ref(window._fb.db, `chats/${session.sessionId}/info`), { unread: false });
    // Listen to messages
    onValue(ref(window._fb.db, `chats/${session.sessionId}/messages`), snap => {
      const data = snap.val();
      if (!data) { setChatMsgs([]); return; }
      const list = Object.entries(data).map(([id,v])=>({id,...v}));
      list.sort((a,b)=>a.ts-b.ts);
      setChatMsgs(list);
      // Mark all user messages as read
      Object.entries(data).forEach(([id,v])=>{
        if(v.sender==="user"&&!v.read){
          update(ref(window._fb.db, `chats/${session.sessionId}/messages/${id}`), {read:true});
        }
      });
    });
  };

  // ── Admin reply ──
  const sendReply = async () => {
    if (!reply.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      const { ref, push, update } = window._fb;
      await push(ref(window._fb.db, `chats/${activeChat.sessionId}/messages`), {
        text: reply.trim(),
        sender: "admin",
        senderName: "Admin",
        ts: Date.now(),
        read: false,
      });
      await update(ref(window._fb.db, `chats/${activeChat.sessionId}/info`), {
        lastMsg: `[Admin]: ${reply.trim().slice(0,40)}`,
        lastActive: Date.now(),
      });
      setReply("");
    } catch(e) {}
    setSending(false);
    setTimeout(()=>bottomRef2.current?.scrollIntoView({behavior:"smooth"}), 100);
  };

  useEffect(()=>{ bottomRef2.current?.scrollIntoView({behavior:"smooth"}); }, [chatMsgs]);

  // ── Code management ──
  const loadCodes = () => {
    const stored = JSON.parse(localStorage.getItem("kd_valid_codes")||"{}");
    setGenerated(Object.entries(stored).map(([code,v])=>({code,...v})).reverse());
  };
  const handleGenerate = () => {
    const code = generateActivationCode(plan);
    const stored = JSON.parse(localStorage.getItem("kd_valid_codes")||"{}");
    stored[code] = {plan, used:false, createdAt:new Date().toISOString()};
    localStorage.setItem("kd_valid_codes", JSON.stringify(stored));
    loadCodes();
  };
  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(()=>{ setCopied2(p=>({...p,[code]:true})); setTimeout(()=>setCopied2(p=>({...p,[code]:false})),2000); });
  };
  const copyEmailTemplate = (code, plan) => {
    const text = `Halo!\n\nTerima kasih sudah upgrade ke KingDegen ${plan}! 🎉\n\nKode aktivasi kamu:\n\n${code}\n\nCara aktivasi:\n1. Buka KingDegen website\n2. Klik tombol "AKTIVASI" di header\n3. Masukkan kode di atas\n4. Plan kamu langsung aktif!\n\nSelamat trading!\n— Tim KingDegen`;
    navigator.clipboard.writeText(text).then(()=>alert("✅ Template email disalin!"));
  };
  const revokeCode = (code) => {
    if(!window.confirm(`Hapus kode ${code}?`)) return;
    const stored = JSON.parse(localStorage.getItem("kd_valid_codes")||"{}");
    delete stored[code];
    localStorage.setItem("kd_valid_codes", JSON.stringify(stored));
    loadCodes();
  };

  const unreadCount = sessions.filter(s=>s.unread).length;

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{borderColor:C.accent,maxWidth:"500px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:"20px",letterSpacing:"3px",color:C.accent}}>🔧 ADMIN PANEL</div>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>KingDegen Management Console</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:"20px",cursor:"pointer"}}>✕</button>
        </div>

        {/* LOGIN */}
        {!authed?(
          <div>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"6px"}}>ADMIN PASSWORD</div>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="Password admin..." className={shaking?"shake":""}
              style={{width:"100%",background:C.surface,border:`1px solid ${passErr?C.red:C.border}`,borderRadius:"6px",padding:"11px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"13px",outline:"none",marginBottom:"10px"}}
            />
            {passErr&&<div style={{fontSize:"10px",color:C.red,fontFamily:"'Share Tech Mono'",marginBottom:"8px"}}>⚠ Password salah</div>}
            <button onClick={handleLogin}
              style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${C.accent},#ff6b35)`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"2px",cursor:"pointer"}}>
              LOGIN ADMIN
            </button>
          </div>
        ):(
          <div>
            {/* Admin Tabs */}
            <div style={{display:"flex",gap:"6px",marginBottom:"16px"}}>
              {[
                {id:"CHAT", label:`💬 CHAT${unreadCount>0?` (${unreadCount})`:""}`, color: unreadCount>0?C.green:C.primary},
                {id:"CODES", label:"🔑 KODE AKTIVASI", color:C.primary},
                {id:"ORDERS", label:"📦 PEMBELIAN", color:C.yellow},
              ].map(t=>(
                <button key={t.id} onClick={()=>{setAdminTab(t.id);if(t.id!=="CHAT")setActiveChat(null);}}
                  style={{flex:1,padding:"8px 4px",background:adminTab===t.id?`${t.color}22`:C.surface,border:`1px solid ${adminTab===t.id?t.color:C.border}`,borderRadius:"6px",color:adminTab===t.id?t.color:C.muted,fontFamily:"'Share Tech Mono'",fontSize:"8px",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── CHAT TAB ── */}
            {adminTab==="CHAT"&&(
              <div>
                {!activeChat?(
                  // Session list
                  <div>
                    <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"10px"}}>
                      SEMUA PERCAKAPAN ({sessions.length})
                      {unreadCount>0&&<span style={{marginLeft:"8px",color:C.green}}>· {unreadCount} belum dibaca</span>}
                    </div>
                    {!fbReady&&(
                      <div style={{textAlign:"center",padding:"30px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"11px"}}>
                        <div style={{fontSize:"20px",animation:"spin 1s linear infinite",display:"inline-block",marginBottom:"8px"}}>⟳</div>
                        <div>Connecting to Firebase...</div>
                      </div>
                    )}
                    {fbReady&&sessions.length===0&&(
                      <div style={{textAlign:"center",padding:"30px",color:C.dim,fontFamily:"'Share Tech Mono'",fontSize:"10px"}}>
                        Belum ada pesan masuk dari user.
                      </div>
                    )}
                    <div style={{maxHeight:"340px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                      {sessions.map(s=>(
                        <div key={s.sessionId} onClick={()=>openChat(s)}
                          style={{padding:"12px 14px",background:s.unread?`${C.green}0a`:C.surface,border:`1px solid ${s.unread?C.green:C.border}`,borderRadius:"8px",cursor:"pointer",transition:"all 0.2s"}}
                          onMouseOver={e=>e.currentTarget.style.borderColor=C.primary}
                          onMouseOut={e=>e.currentTarget.style.borderColor=s.unread?C.green:C.border}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                              <div style={{width:"28px",height:"28px",borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:"14px",color:s.unread?C.green:"#fff",letterSpacing:"1px"}}>{s.name}</div>
                                <div style={{fontSize:"8px",color:C.dim,fontFamily:"'Share Tech Mono'"}}>{s.msgCount} pesan</div>
                              </div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:"8px",padding:"1px 6px",borderRadius:"20px",background:`${s.plan==="WHALE"?C.accent:s.plan==="DEGEN"?C.primary:C.muted}22`,color:s.plan==="WHALE"?C.accent:s.plan==="DEGEN"?C.primary:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"3px"}}>{s.plan}</div>
                              <div style={{fontSize:"8px",color:C.dim,fontFamily:"'Share Tech Mono'"}}>{dateStr(s.lastActive)}</div>
                              {s.unread&&<div style={{fontSize:"8px",color:C.green,fontFamily:"'Share Tech Mono'",animation:"blink 1.5s infinite"}}>● BARU</div>}
                            </div>
                          </div>
                          <div style={{fontSize:"10px",color:C.muted,fontFamily:"'Rajdhani',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.lastMsg||"..."}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ):(
                  // Chat detail
                  <div style={{display:"flex",flexDirection:"column",height:"400px"}}>
                    {/* Back + header */}
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px",paddingBottom:"10px",borderBottom:`1px solid ${C.border}`}}>
                      <button onClick={()=>setActiveChat(null)}
                        style={{padding:"4px 10px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"4px",color:C.muted,fontFamily:"'Share Tech Mono'",fontSize:"9px",cursor:"pointer"}}>
                        ← BACK
                      </button>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:"16px",color:"#fff",letterSpacing:"1px"}}>{activeChat.name}</div>
                        <div style={{fontSize:"8px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>{activeChat.plan} · {activeChat.sessionId.slice(0,16)}...</div>
                      </div>
                    </div>
                    {/* Messages */}
                    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px",paddingBottom:"8px"}}>
                      {chatMsgs.length===0&&(
                        <div style={{textAlign:"center",padding:"20px",color:C.dim,fontFamily:"'Share Tech Mono'",fontSize:"10px"}}>
                          <div style={{fontSize:"20px",animation:"spin 1s linear infinite",display:"inline-block",marginBottom:"6px"}}>⟳</div>
                          <div>Loading pesan...</div>
                        </div>
                      )}
                      {chatMsgs.map(msg=>(
                        <div key={msg.id} className="msg-bubble" style={{display:"flex",justifyContent:msg.sender==="admin"?"flex-end":"flex-start"}}>
                          <div style={{
                            maxWidth:"80%",padding:"8px 12px",
                            background:msg.sender==="admin"?`${C.accent}22`:C.surface,
                            border:`1px solid ${msg.sender==="admin"?C.accent:C.border}`,
                            borderRadius:msg.sender==="admin"?"10px 10px 2px 10px":"10px 10px 10px 2px",
                          }}>
                            <div style={{fontSize:"11px",color:C.text,fontFamily:"'Rajdhani',sans-serif",fontWeight:600,lineHeight:1.5,wordBreak:"break-word"}}>
                              {msg.text}
                            </div>
                            <div style={{fontSize:"8px",color:C.dim,fontFamily:"'Share Tech Mono'",marginTop:"3px",textAlign:msg.sender==="admin"?"right":"left"}}>
                              {msg.sender==="admin"?"Admin":activeChat.name} · {timeStr(msg.ts)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef2}/>
                    </div>
                    {/* Reply input */}
                    <div style={{display:"flex",gap:"6px",paddingTop:"8px",borderTop:`1px solid ${C.border}`}}>
                      <input
                        value={reply} onChange={e=>setReply(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
                        placeholder="Balas pesan..."
                        style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"9px 12px",color:C.accent,fontFamily:"'Rajdhani',sans-serif",fontSize:"12px",fontWeight:600,outline:"none"}}
                        onFocus={e=>e.target.style.border=`1px solid ${C.accent}`}
                        onBlur={e=>e.target.style.border=`1px solid ${C.border}`}
                        autoFocus
                      />
                      <button onClick={sendReply} disabled={!reply.trim()||sending}
                        style={{padding:"9px 14px",background:reply.trim()?`linear-gradient(135deg,${C.accent},#ff6b35)`:"transparent",border:reply.trim()?"none":`1px solid ${C.border}`,borderRadius:"6px",color:reply.trim()?"#fff":C.muted,fontFamily:"'Bebas Neue'",fontSize:"14px",cursor:reply.trim()?"pointer":"not-allowed",flexShrink:0}}>
                        {sending?"⟳":"KIRIM"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CODES TAB ── */}
            {adminTab==="CODES"&&(
              <div>
                <div style={{padding:"14px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`,marginBottom:"14px"}}>
                  <div style={{fontSize:"9px",color:C.accent,fontFamily:"'Share Tech Mono'",marginBottom:"10px",letterSpacing:"1px"}}>GENERATE KODE BARU</div>
                  <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                    {["DEGEN","WHALE"].map(p=>(
                      <button key={p} onClick={()=>setPlan(p)}
                        style={{flex:1,padding:"8px",background:plan===p?(p==="DEGEN"?C.primaryDim:`${C.accent}22`):C.surface,border:`1px solid ${plan===p?(p==="DEGEN"?C.primary:C.accent):C.border}`,borderRadius:"6px",color:plan===p?(p==="DEGEN"?C.primary:C.accent):C.muted,fontFamily:"'Share Tech Mono'",fontSize:"10px",cursor:"pointer"}}>
                        {p} {p==="DEGEN"?"($9)":"($25)"}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleGenerate}
                    style={{width:"100%",padding:"11px",background:plan==="DEGEN"?`linear-gradient(135deg,${C.primary},${C.accent})`:`linear-gradient(135deg,${C.accent},#ff6b35)`,border:"none",borderRadius:"6px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"14px",letterSpacing:"2px",cursor:"pointer"}}>
                    + GENERATE KODE {plan}
                  </button>
                </div>
                <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"8px"}}>DAFTAR KODE ({generated.length})</div>
                <div style={{maxHeight:"260px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                  {generated.length===0&&<div style={{textAlign:"center",padding:"20px",color:C.dim,fontFamily:"'Share Tech Mono'",fontSize:"10px"}}>Belum ada kode.</div>}
                  {generated.map(({code,plan:p,used,createdAt})=>(
                    <div key={code} style={{padding:"10px 12px",background:C.surface,borderRadius:"6px",border:`1px solid ${used?C.dim:p==="DEGEN"?C.borderGlow:C.accent}`,opacity:used?0.55:1}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"}}>
                        <div style={{fontFamily:"'Share Tech Mono'",fontSize:"10px",color:used?C.muted:p==="DEGEN"?C.primary:C.accent,letterSpacing:"1px"}}>{code}</div>
                        <div style={{display:"flex",gap:"4px"}}>
                          {!used&&<button className="copy-btn" onClick={()=>copyCode(code)}>{copied2[code]?"✓":"COPY"}</button>}
                          {!used&&<button className="copy-btn" onClick={()=>copyEmailTemplate(code,p)} style={{borderColor:"#00ff8844",color:C.green}}>EMAIL</button>}
                          {!used&&<button className="copy-btn" onClick={()=>revokeCode(code)} style={{borderColor:"#ff2d5544",color:C.red}}>DEL</button>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:"8px",fontSize:"8px",color:C.dim,fontFamily:"'Share Tech Mono'"}}>
                        <span style={{color:p==="DEGEN"?C.primary:C.accent}}>{p}</span>
                        <span>·</span>
                        <span style={{color:used?C.red:C.green}}>{used?"DIPAKAI":"AKTIF"}</span>
                        <span>·</span>
                        <span>{new Date(createdAt).toLocaleDateString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ORDERS TAB ── */}
            {adminTab==="ORDERS"&&(
              <div>
                <div style={{padding:"14px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`,marginBottom:"14px"}}>
                  <div style={{fontSize:"9px",color:C.yellow,fontFamily:"'Share Tech Mono'",marginBottom:"8px",letterSpacing:"1px"}}>📧 CEK EMAIL PEMBELIAN</div>
                  <div style={{fontSize:"11px",color:C.muted,lineHeight:1.7}}>
                    Ketika user klik "Konfirmasi Pembayaran" di tab Pricing, email otomatis terkirim ke:
                  </div>
                  <div style={{marginTop:"8px",padding:"8px 12px",background:C.surface,borderRadius:"6px",fontFamily:"'Share Tech Mono'",fontSize:"11px",color:C.primary}}>{NOTIFY_EMAIL}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <div style={{padding:"12px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px"}}>
                    <div style={{fontSize:"9px",color:C.yellow,fontFamily:"'Share Tech Mono'",marginBottom:"8px"}}>WORKFLOW KONFIRMASI MANUAL:</div>
                    {[
                      "Terima email notifikasi pembelian",
                      "Cek blockchain: Solana (solscan.io) atau BSC (bscscan.com)",
                      "Verifikasi jumlah USDT sudah masuk ke wallet",
                      "Buka tab KODE AKTIVASI → Generate kode sesuai plan",
                      "Klik EMAIL → copy template → kirim ke email buyer",
                      "Buyer input kode → plan aktif otomatis",
                    ].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:"8px",marginBottom:"6px"}}>
                        <span style={{fontSize:"10px",color:C.yellow,fontFamily:"'Share Tech Mono'",flexShrink:0,minWidth:"16px"}}>{i+1}.</span>
                        <span style={{fontSize:"11px",color:C.muted}}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <a href={`https://solscan.io/account/${WALLETS.SOL}`} target="_blank" rel="noopener noreferrer"
                    style={{display:"block",padding:"10px",background:C.primaryDim,border:`1px solid ${C.borderGlow}44`,borderRadius:"6px",color:C.primary,textDecoration:"none",fontFamily:"'Bebas Neue'",fontSize:"12px",letterSpacing:"2px",textAlign:"center"}}>
                    ◎ CEK WALLET SOLANA ↗
                  </a>
                  <a href={`https://bscscan.com/address/${WALLETS.BNB}`} target="_blank" rel="noopener noreferrer"
                    style={{display:"block",padding:"10px",background:`${C.yellow}11`,border:`1px solid ${C.yellow}33`,borderRadius:"6px",color:C.yellow,textDecoration:"none",fontFamily:"'Bebas Neue'",fontSize:"12px",letterSpacing:"2px",textAlign:"center"}}>
                    ⬡ CEK WALLET BNB ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAYMENT MODAL ───────────────────────────────────────────
function PaymentModal({plan, price, onClose}) {
  const [network, setNetwork] = useState("SOL");
  const [email,   setEmail]   = useState("");
  const [copied,  setCopied]  = useState(false);
  const [step,    setStep]    = useState(1);
  const wallet = network==="SOL"?WALLETS.SOL:WALLETS.BNB;

  const copyWallet = () => {
    navigator.clipboard.writeText(wallet).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  const handleConfirm = () => {
    if(!email.trim()||!email.includes("@")) return;
    const subj = encodeURIComponent(`[KingDegen] NEW ${plan} Purchase`);
    const body = encodeURIComponent(
`=== KINGDEGEN PURCHASE REQUEST ===\n\nPlan: ${plan} ($${price}/month)\nUser Email: ${email}\nNetwork: ${network==="SOL"?"Solana (SPL)":"BNB Chain (BEP20)"}\nWallet Tujuan: ${wallet}\n\nTimestamp: ${new Date().toLocaleString("id-ID")}\n\n=== CARA KONFIRMASI ===\n1. Cek blockchain apakah $${price} USDT sudah masuk ke wallet\n2. Buka Admin Panel → Generate kode ${plan}\n3. Kirim kode ke email user: ${email}`
    );
    window.open(`mailto:${NOTIFY_EMAIL}?subject=${subj}&body=${body}`, "_blank");
    setStep(2);
  };

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:"22px",letterSpacing:"3px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              UPGRADE TO {plan}
            </div>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>USDT · Konfirmasi manual 1-24 jam</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:"20px",cursor:"pointer"}}>✕</button>
        </div>
        {step===1&&<>
          <div style={{marginBottom:"14px"}}>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"6px"}}>PILIH NETWORK</div>
            <div style={{display:"flex",gap:"8px"}}>
              {["SOL","BNB"].map(n=>(
                <button key={n} onClick={()=>setNetwork(n)}
                  style={{flex:1,padding:"9px",background:network===n?C.primaryDim:C.surface,border:`1px solid ${network===n?C.primary:C.border}`,borderRadius:"6px",color:network===n?C.primary:C.muted,fontFamily:"'Share Tech Mono'",fontSize:"11px",cursor:"pointer",transition:"all 0.2s"}}>
                  {n==="SOL"?"◎ Solana":"⬡ BNB Chain"}
                </button>
              ))}
            </div>
          </div>
          <div style={{padding:"10px 14px",background:`${C.primary}11`,border:`1px solid ${C.primary}33`,borderRadius:"8px",marginBottom:"14px",textAlign:"center"}}>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"2px"}}>KIRIM TEPAT</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:"32px",color:C.primary,letterSpacing:"2px"}}>${price} USDT</div>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>{network==="SOL"?"Solana SPL Token":"BNB Chain BEP20"}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
            <QRCode value={wallet} size={140}/>
            <div style={{width:"100%",padding:"10px 12px",background:C.card,borderRadius:"6px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:"8px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"4px"}}>WALLET ADDRESS</div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",wordBreak:"break-all",flex:1,lineHeight:1.5}}>{wallet}</div>
                <button className="copy-btn" onClick={copyWallet}>{copied?"✓ OK":"COPY"}</button>
              </div>
            </div>
          </div>
          <div style={{marginBottom:"14px"}}>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"6px"}}>EMAIL KAMU (untuk terima kode aktivasi)</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@kamu.com"
              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"11px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"12px",outline:"none"}}
              onFocus={e=>e.target.style.border=`1px solid ${C.primary}`}
              onBlur={e=>e.target.style.border=`1px solid ${C.border}`}
            />
          </div>
          <button onClick={handleConfirm} disabled={!email.includes("@")}
            style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"3px",cursor:email.includes("@")?"pointer":"not-allowed",opacity:email.includes("@")?1:0.5,animation:"pulse 2s infinite"}}>
            ✉ KONFIRMASI PEMBAYARAN
          </button>
        </>}
        {step===2&&(
          <div style={{textAlign:"center",padding:"10px 0",animation:"fadeUp 0.4s ease"}}>
            <div style={{fontSize:"48px",marginBottom:"12px"}}>📨</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:"20px",color:C.green,letterSpacing:"3px",marginBottom:"10px"}}>KONFIRMASI TERKIRIM!</div>
            <div style={{fontSize:"12px",color:C.muted,lineHeight:1.8,marginBottom:"16px"}}>
              Notifikasi dikirim ke tim kami.<br/>
              Kode aktivasi akan dikirim ke:<br/>
              <span style={{color:C.primary,fontFamily:"'Share Tech Mono'"}}>{email}</span>
            </div>
            <div style={{padding:"10px",background:`${C.yellow}11`,border:`1px solid ${C.yellow}33`,borderRadius:"6px",fontSize:"9px",color:C.yellow,fontFamily:"'Share Tech Mono'",marginBottom:"14px"}}>
              ⚠ Screenshot bukti transfer dan simpan!
            </div>
            <button onClick={onClose}
              style={{width:"100%",padding:"12px",background:C.primaryDim,border:`1px solid ${C.borderGlow}44`,borderRadius:"8px",color:C.primary,fontFamily:"'Bebas Neue'",fontSize:"14px",letterSpacing:"2px",cursor:"pointer"}}>
              TUTUP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ACTIVATION MODAL ────────────────────────────────────────
function ActivationModal({onClose, onActivated}) {
  const [code,    setCode]    = useState("");
  const [status,  setStatus]  = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleActivate = () => {
    if(!code.trim()) return;
    setLoading(true);
    setTimeout(()=>{
      const upper = code.trim().toUpperCase();
      const parts = upper.split("-");
      if(parts.length===3 && ["DEGEN","WHALE"].includes(parts[0]) && parts[1].length===4 && parts[2].length===4) {
        const stored = JSON.parse(localStorage.getItem("kd_valid_codes")||"{}");
        if(stored[upper] && !stored[upper].used) {
          stored[upper].used = true;
          localStorage.setItem("kd_valid_codes", JSON.stringify(stored));
          saveActivation({plan:parts[0], code:upper, activatedAt:new Date().toISOString()});
          setStatus("ok");
          setTimeout(()=>{ onActivated(parts[0]); onClose(); }, 1500);
        } else if(stored[upper]?.used) {
          setStatus("used"); setShaking(true); setTimeout(()=>setShaking(false),500);
        } else {
          setStatus("error"); setShaking(true); setTimeout(()=>setShaking(false),500);
        }
      } else {
        setStatus("error"); setShaking(true); setTimeout(()=>setShaking(false),500);
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:"22px",letterSpacing:"3px",color:C.primary}}>INPUT KODE AKTIVASI</div>
            <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>Kode dikirim via email setelah verifikasi</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:"20px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"14px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`,marginBottom:"16px"}}>
          <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"4px"}}>FORMAT KODE</div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:"18px",color:C.primary,letterSpacing:"3px"}}>DEGEN-XXXX-XXXX</div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:"18px",color:C.accent,letterSpacing:"3px"}}>WHALE-XXXX-XXXX</div>
        </div>
        <div style={{marginBottom:"14px"}}>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&handleActivate()}
            placeholder="DEGEN-XXXX-XXXX" maxLength={14} className={shaking?"shake":""}
            style={{width:"100%",background:C.surface,border:`1px solid ${status==="error"||status==="used"?C.red:status==="ok"?C.green:C.border}`,borderRadius:"6px",padding:"13px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"15px",outline:"none",letterSpacing:"2px",textAlign:"center",transition:"border 0.2s"}}
          />
          {status==="error"&&<div style={{fontSize:"10px",color:C.red,fontFamily:"'Share Tech Mono'",marginTop:"6px",textAlign:"center"}}>⚠ Kode tidak valid atau belum terdaftar</div>}
          {status==="used"&&<div style={{fontSize:"10px",color:C.red,fontFamily:"'Share Tech Mono'",marginTop:"6px",textAlign:"center"}}>⚠ Kode sudah pernah digunakan</div>}
          {status==="ok"&&<div style={{fontSize:"10px",color:C.green,fontFamily:"'Share Tech Mono'",marginTop:"6px",textAlign:"center"}}>✓ KODE VALID — MENGAKTIFKAN...</div>}
        </div>
        <button onClick={handleActivate} disabled={loading||!code.trim()||status==="ok"}
          style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"3px",cursor:"pointer",opacity:loading?"0.7":"1",animation:"pulse 2s infinite"}}>
          {loading?"⟳ MEMVERIFIKASI...":"🔓 AKTIFKAN SEKARANG"}
        </button>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────
const NAV    = ["SCANNER","TRENDING","NEWS","CREATE TOKEN","PRICING","CHAT"];
const STABS  = ["OVERVIEW","CONTRACT","TOKENOMICS","ON-CHAIN","SOCIAL"];
const CHAINS = [{label:"ETH",id:"1"},{label:"BSC",id:"56"},{label:"SOL",id:"solana"},{label:"BASE",id:"8453"},{label:"ARB",id:"42161"}];

// ════════════════════════════════════════════════════════════
export default function KingDegen() {
  const [ca,setCa]               = useState("");
  const [chain,setChain]         = useState("solana");
  const [nav,setNav]             = useState("SCANNER");
  const [scanTab,setScanTab]     = useState("OVERVIEW");
  const [loading,setLoading]     = useState(false);
  const [result,setResult]       = useState(null);
  const [error,setError]         = useState("");
  const [typed,setTyped]         = useState("");
  const [scansUsed,setScansUsed] = useState(0);
  const [plan,setPlan]           = useState(()=>(getStoredActivation()?.plan||"FREE"));
  const [payModal,setPayModal]   = useState(null);
  const [showActivate,setShowActivate] = useState(false);
  const [showAdmin,setShowAdmin] = useState(false);
  const [trending,setTrending]   = useState([]);
  const [trendLoading,setTrendLoading] = useState(false);
  const [selTrend,setSelTrend]   = useState(null);
  const [trendRes,setTrendRes]   = useState(null);
  const [trendLoad2,setTrendLoad2] = useState(false);
  const [news,setNews]           = useState([]);
  const [newsLoading,setNewsLoading] = useState(false);
  const [newsLoaded,setNewsLoaded]   = useState(false);
  const [token,setToken]         = useState({name:"",ticker:"",supply:"1000000000",desc:"",decimals:"9"});
  const [logoTaps,setLogoTaps]   = useState(0);

  const handleLogoTap = () => {
    const next = logoTaps+1; setLogoTaps(next);
    if(next>=5){ setShowAdmin(true); setLogoTaps(0); }
    setTimeout(()=>setLogoTaps(0), 3000);
  };

  const limit = plan==="FREE"?5:plan==="DEGEN"?100:999999;
  const left  = Math.max(0,limit-scansUsed);
  const maxed = plan==="FREE"&&scansUsed>=5;

  useEffect(()=>{
    if(nav==="TRENDING"&&trending.length===0){
      setTrendLoading(true);
      fetchTrending().then(d=>{setTrending(d);setTrendLoading(false);});
    }
  },[nav]);

  useEffect(()=>{
    if(nav==="NEWS"&&!newsLoaded){
      setNewsLoading(true);
      fetchNews().then(d=>{setNews(d);setNewsLoading(false);setNewsLoaded(true);});
    }
  },[nav,newsLoaded]);

  const handleScan = async(caO,chainO) => {
    const scanCA=caO||ca, scanChain=chainO||chain;
    if(!scanCA.trim()||maxed) return;
    setLoading(true);setResult(null);setError("");
    const msgs=["CONNECTING TO CHAIN...","FETCHING CONTRACT...","ANALYZING TOKENOMICS...","SCANNING SECURITY...","COMPUTING RISK SCORE..."];
    let i=0;
    const t=setInterval(()=>{if(i<msgs.length){setTyped(msgs[i]);i++;}},600);
    try {
      const [gp,dex]=await Promise.all([fetchGoPlus(scanCA,scanChain),fetchDexScreener(scanCA)]);
      clearInterval(t);
      if(!gp&&!dex){setError("Token not found. Check CA and chain.");setLoading(false);return;}
      setResult({gp,dex,score:computeScore(gp),label:computeLabel(computeScore(gp))});
      setScansUsed(p=>p+1);setScanTab("OVERVIEW");
    } catch(e){clearInterval(t);setError("Failed to fetch. Try again.");}
    setLoading(false);
  };

  const handleTrendClick = async(t) => {
    setSelTrend(t);setTrendRes(null);setTrendLoad2(true);
    try{
      const chainId=t.chain==="ethereum"?"1":t.chain==="bsc"?"56":t.chain==="base"?"8453":t.chain==="arbitrum"?"42161":t.chain;
      const [gp,dex]=await Promise.all([fetchGoPlus(t.ca,chainId),fetchDexScreener(t.ca)]);
      setTrendRes({gp,dex,score:computeScore(gp),label:computeLabel(computeScore(gp))});
    }catch(e){}
    setTrendLoad2(false);
  };

  const d = result;
  const planColor = plan==="WHALE"?C.accent:plan==="DEGEN"?C.primary:C.muted;

  return (
    <>
      <style>{css}</style>
      {payModal&&<PaymentModal plan={payModal.plan} price={payModal.price} onClose={()=>setPayModal(null)}/>}
      {showActivate&&<ActivationModal onClose={()=>setShowActivate(false)} onActivated={p=>setPlan(p)}/>}
      {showAdmin&&<AdminPanel onClose={()=>setShowAdmin(false)}/>}

      <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Rajdhani',sans-serif",position:"relative",overflow:"hidden"}}>
        <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:`linear-gradient(${C.border}55 1px,transparent 1px),linear-gradient(90deg,${C.border}55 1px,transparent 1px)`,backgroundSize:"40px 40px",animation:"gridMove 8s linear infinite",pointerEvents:"none",opacity:0.5}}/>
        <div style={{position:"fixed",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${C.primary}88,transparent)`,animation:"scanline 5s linear infinite",zIndex:1,pointerEvents:"none"}}/>

        {/* Ticker */}
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,overflow:"hidden",height:"26px",display:"flex",alignItems:"center",position:"relative",zIndex:2}}>
          <div style={{display:"flex",gap:"60px",whiteSpace:"nowrap",animation:"marquee 22s linear infinite",fontFamily:"'Share Tech Mono'",fontSize:"10px",color:C.primary}}>
            {[...Array(2)].map((_,i)=>(
              <span key={i} style={{display:"flex",gap:"60px"}}>
                <span>SOL <span style={{color:C.green}}>↑ +4.2%</span></span>
                <span>ETH <span style={{color:C.red}}>↓ -1.8%</span></span>
                <span>BTC <span style={{color:C.green}}>↑ +2.1%</span></span>
                <span>RUGS TODAY <span style={{color:C.red}}>47</span></span>
                <span>SAFUS VERIFIED <span style={{color:C.green}}>312</span></span>
              </span>
            ))}
          </div>
        </div>

        {/* Header */}
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",zIndex:2,background:`linear-gradient(180deg,${C.surface},transparent)`}}>
          <div onClick={handleLogoTap} style={{cursor:"default",userSelect:"none"}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:"26px",letterSpacing:"5px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"flicker 9s infinite"}}>KINGDEGEN</div>
            <div style={{fontSize:"8px",color:C.muted,fontFamily:"'Share Tech Mono'",letterSpacing:"2px"}}>CONTRACT INTELLIGENCE PROTOCOL</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"5px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`,animation:"blink 2s infinite"}}/>
              <span style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>LIVE</span>
            </div>
            <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
              <div style={{fontSize:"8px",fontFamily:"'Share Tech Mono'",padding:"2px 7px",borderRadius:"20px",background:`${planColor}22`,color:planColor,border:`1px solid ${planColor}55`}}>{plan}</div>
              {plan==="FREE"&&(
                <button onClick={()=>setShowActivate(true)}
                  style={{fontSize:"7px",fontFamily:"'Share Tech Mono'",padding:"2px 7px",borderRadius:"20px",background:C.primaryDim,color:C.primary,border:`1px solid ${C.borderGlow}44`,cursor:"pointer"}}>
                  AKTIVASI
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,background:C.bg,overflowX:"auto"}}>
          {NAV.map(t=>(
            <button key={t} onClick={()=>setNav(t)}
              style={{flex:1,padding:"10px 4px",background:"transparent",border:"none",borderBottom:nav===t?`2px solid ${t==="CHAT"?"#00ff88":C.primary}`:"2px solid transparent",color:nav===t?(t==="CHAT"?C.green:C.primary):C.muted,fontFamily:"'Share Tech Mono'",fontSize:"8px",letterSpacing:"1px",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap",minWidth:"50px"}}>
              {t==="CHAT"?"💬 CHAT":t}
            </button>
          ))}
        </div>

        <div style={{padding:"16px",position:"relative",zIndex:2,maxWidth:"600px",margin:"0 auto"}}>

          {/* SCANNER */}
          {nav==="SCANNER"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{marginBottom:"14px",padding:"10px 14px",background:C.surface,borderRadius:"8px",border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                  <span style={{fontSize:"10px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>DAILY SCANS</span>
                  <span style={{fontSize:"10px",fontFamily:"'Share Tech Mono'",color:left===0?C.red:left<=2?C.yellow:C.primary}}>
                    {plan==="WHALE"?"∞ UNLIMITED":`${left} / ${limit} LEFT`}
                  </span>
                </div>
                <div style={{height:"3px",background:C.dim,borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min((scansUsed/limit)*100,100)}%`,background:`linear-gradient(90deg,${C.primary},${C.accent})`,borderRadius:"2px",transition:"width 0.5s"}}/>
                </div>
                {maxed&&<div style={{marginTop:"8px",fontSize:"10px",color:C.red,fontFamily:"'Share Tech Mono'"}}>
                  ⚠ Limit — <span onClick={()=>setNav("PRICING")} style={{color:C.primary,cursor:"pointer",textDecoration:"underline"}}>Upgrade</span> atau <span onClick={()=>setShowActivate(true)} style={{color:C.green,cursor:"pointer",textDecoration:"underline"}}>input kode aktivasi</span>
                </div>}
              </div>
              <div style={{marginBottom:"10px"}}>
                <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"5px"}}>SELECT CHAIN</div>
                <div style={{display:"flex",gap:"6px"}}>
                  {CHAINS.map(c=>(
                    <button key={c.id} onClick={()=>setChain(c.id)}
                      style={{flex:1,padding:"7px 4px",background:chain===c.id?C.primaryDim:C.surface,border:`1px solid ${chain===c.id?C.primary:C.border}`,borderRadius:"6px",color:chain===c.id?C.primary:C.muted,fontFamily:"'Share Tech Mono'",fontSize:"9px",cursor:"pointer",transition:"all 0.2s"}}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:"18px"}}>
                <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",letterSpacing:"2px",marginBottom:"6px"}}>&gt; PASTE CONTRACT ADDRESS</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <input value={ca} onChange={e=>setCa(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleScan()} placeholder="0x... or SOL address" disabled={maxed}
                    style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"11px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"12px",outline:"none",opacity:maxed?0.4:1}}
                    onFocus={e=>e.target.style.border=`1px solid ${C.primary}`}
                    onBlur={e=>e.target.style.border=`1px solid ${C.border}`}
                  />
                  <button onClick={()=>handleScan()} disabled={loading||maxed}
                    style={{padding:"11px 18px",background:maxed?"transparent":`linear-gradient(135deg,${C.primary},${C.accent})`,border:maxed?`1px solid ${C.border}`:"none",borderRadius:"6px",color:maxed?C.muted:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"2px",cursor:maxed||loading?"not-allowed":"pointer",animation:!loading&&!maxed?"pulse 2s infinite":"none",whiteSpace:"nowrap"}}>
                    {loading?"⟳":"SCAN"}
                  </button>
                </div>
              </div>
              {loading&&<div style={{padding:"14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",fontFamily:"'Share Tech Mono'",fontSize:"12px",color:C.primary,marginBottom:"14px"}}>
                <span style={{animation:"blink 0.7s infinite",display:"inline-block"}}>▋</span> {typed}
              </div>}
              {error&&<div style={{padding:"14px",background:`${C.red}11`,border:`1px solid ${C.red}44`,borderRadius:"8px",fontFamily:"'Share Tech Mono'",fontSize:"12px",color:C.red,marginBottom:"14px"}}>⚠ {error}</div>}
              {d&&(
                <div style={{animation:"fadeUp 0.4s ease"}}>
                  <div style={{background:C.surface,border:`1px solid ${labelColor(d.label)}55`,borderRadius:"12px",padding:"16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"14px"}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
                        <circle cx="35" cy="35" r="28" fill="none" stroke={C.dim} strokeWidth="5"/>
                        <circle cx="35" cy="35" r="28" fill="none" stroke={scoreColor(d.score)} strokeWidth="5"
                          strokeDasharray="176" strokeDashoffset={176-(d.score/100)*176} strokeLinecap="round"
                          style={{filter:`drop-shadow(0 0 6px ${scoreColor(d.score)})`,transition:"stroke-dashoffset 1s ease"}}/>
                      </svg>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                        <span style={{fontFamily:"'Bebas Neue'",fontSize:"20px",color:scoreColor(d.score),lineHeight:1}}>{d.score}</span>
                        <span style={{fontSize:"7px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>/100</span>
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Bebas Neue'",fontSize:"22px",color:"#fff"}}>{d.dex?.name||"Unknown"}</span>
                        <span style={{fontSize:"10px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>${d.dex?.ticker||"???"}</span>
                      </div>
                      <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"8px"}}>
                        {d.dex?.price&&<span style={{fontSize:"9px",padding:"2px 7px",background:C.accentDim,borderRadius:"20px",color:C.accent,fontFamily:"'Share Tech Mono'"}}>$ {parseFloat(d.dex.price)<0.0001?parseFloat(d.dex.price).toExponential(2):parseFloat(d.dex.price).toFixed(6)}</span>}
                        {d.dex?.mcap&&<span style={{fontSize:"9px",padding:"2px 7px",background:C.surface,borderRadius:"20px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>MC: {d.dex.mcap}</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <div style={{padding:"3px 10px",borderRadius:"4px",background:`${labelColor(d.label)}22`,border:`1px solid ${labelColor(d.label)}`,color:labelColor(d.label),fontFamily:"'Bebas Neue'",fontSize:"13px",letterSpacing:"2px"}}>⚡ {d.label}</div>
                        {d.dex?.dexUrl&&<a href={d.dex.dexUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"9px",padding:"3px 10px",background:C.primaryDim,borderRadius:"4px",color:C.primary,textDecoration:"none",fontFamily:"'Share Tech Mono'"}}>DEX ↗</a>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"12px",overflowX:"auto"}}>
                    {STABS.map(t=>(
                      <button key={t} onClick={()=>setScanTab(t)}
                        style={{padding:"8px 10px",background:"transparent",border:"none",borderBottom:scanTab===t?`2px solid ${C.primary}`:"2px solid transparent",color:scanTab===t?C.primary:C.muted,fontFamily:"'Share Tech Mono'",fontSize:"8px",letterSpacing:"1px",cursor:"pointer",whiteSpace:"nowrap"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"8px",animation:"fadeUp 0.3s ease"}}>
                    {scanTab==="OVERVIEW"&&d.gp&&[
                      {label:"Contract Verified",val:d.gp.verified,bool:true},
                      {label:"Ownership Renounced",val:d.gp.renounced,bool:true},
                      {label:"Honeypot Detected",val:d.gp.honeypot,bool:true,invert:true},
                      {label:"LP Locked",val:d.gp.lp_locked,bool:true},
                      {label:"Sell Tax",val:`${d.gp.sell_tax.toFixed(1)}%`,warn:d.gp.sell_tax>5},
                      {label:"LP Size",val:d.dex?.lp_size||"—"},
                      {label:"Volume 24h",val:d.dex?.volume24h||"—"},
                      {label:"Market Cap",val:d.dex?.mcap||"—"},
                    ].map(r=><Row key={r.label} {...r}/>)}
                    {scanTab==="CONTRACT"&&d.gp&&<>
                      <div style={{padding:"12px 14px",background:C.card,borderRadius:"6px",border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:"8px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"4px"}}>CONTRACT ADDRESS</div>
                        <div style={{fontSize:"11px",color:C.primary,fontFamily:"'Share Tech Mono'",wordBreak:"break-all"}}>{ca}</div>
                      </div>
                      {[
                        {label:"Verified on Explorer",val:d.gp.verified,bool:true},
                        {label:"Ownership Renounced",val:d.gp.renounced,bool:true},
                        {label:"Mint Function Active",val:d.gp.mint,bool:true,invert:true},
                        {label:"Honeypot Detected",val:d.gp.honeypot,bool:true,invert:true},
                        {label:"Buy Tax",val:`${d.gp.buy_tax.toFixed(1)}%`},
                        {label:"Sell Tax",val:`${d.gp.sell_tax.toFixed(1)}%`,warn:d.gp.sell_tax>5},
                        {label:"Proxy / Upgradeable",val:d.gp.proxy,bool:true,invert:true},
                      ].map(r=><Row key={r.label} {...r}/>)}
                    </>}
                    {scanTab==="TOKENOMICS"&&d.gp&&[
                      {label:"Total Holders",val:d.gp.holders.toLocaleString()},
                      {label:"Dev Wallet %",val:`${d.gp.dev_wallet.toFixed(1)}%`,warn:d.gp.dev_wallet>5},
                      {label:"LP Locked",val:d.gp.lp_locked,bool:true},
                      {label:"LP Size",val:d.dex?.lp_size||"—"},
                    ].map(r=><Row key={r.label} {...r}/>)}
                    {scanTab==="ON-CHAIN"&&d.dex&&[
                      {label:"Price USD",val:`$ ${parseFloat(d.dex.price)<0.0001?parseFloat(d.dex.price).toExponential(2):parseFloat(d.dex.price).toFixed(6)}`},
                      {label:"Market Cap",val:d.dex.mcap},
                      {label:"Transactions 24h",val:d.dex.tx24h.toLocaleString()},
                      {label:"Volume 24h",val:d.dex.volume24h},
                      {label:"Price Change 24h",val:`${d.dex.priceChange24h>0?"+":""}${d.dex.priceChange24h}%`,warn:d.dex.priceChange24h<-20},
                      {label:"Token Age",val:d.dex.age},
                    ].map(r=><Row key={r.label} {...r}/>)}
                    {scanTab==="SOCIAL"&&(
                      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                        <a href={`https://twitter.com/search?q=%24${d.dex?.ticker||ca}`} target="_blank" rel="noopener noreferrer"
                          style={{display:"block",padding:"12px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,borderRadius:"6px",color:"#fff",textDecoration:"none",fontFamily:"'Bebas Neue'",fontSize:"14px",letterSpacing:"2px",textAlign:"center"}}>
                          𝕏 SEARCH ON TWITTER
                        </a>
                        <a href={`https://dexscreener.com/search?q=${d.dex?.ticker||ca}`} target="_blank" rel="noopener noreferrer"
                          style={{display:"block",padding:"12px",background:C.primaryDim,border:`1px solid ${C.borderGlow}44`,borderRadius:"6px",color:C.primary,textDecoration:"none",fontFamily:"'Bebas Neue'",fontSize:"14px",letterSpacing:"2px",textAlign:"center"}}>
                          📊 VIEW ON DEXSCREENER
                        </a>
                        <button onClick={()=>setNav("CHAT")}
                          style={{padding:"12px",background:`${C.green}11`,border:`1px solid ${C.green}44`,borderRadius:"6px",color:C.green,fontFamily:"'Bebas Neue'",fontSize:"14px",letterSpacing:"2px",cursor:"pointer",width:"100%"}}>
                          💬 TANYA ADMIN DI CHAT
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{marginTop:"14px",padding:"10px 14px",background:`${C.red}11`,border:`1px solid ${C.red}22`,borderRadius:"6px",fontSize:"9px",color:`${C.red}88`,fontFamily:"'Share Tech Mono'",lineHeight:1.7}}>
                    ⚠ DYOR. Not financial advice.
                  </div>
                </div>
              )}
              {!d&&!loading&&!error&&(
                <div style={{textAlign:"center",padding:"50px 20px"}}>
                  <div style={{fontSize:"42px",marginBottom:"12px",opacity:0.15}}>👑</div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:"18px",color:C.dim,letterSpacing:"4px"}}>PASTE CA TO SCAN</div>
                  <div style={{fontSize:"10px",color:C.dim,fontFamily:"'Share Tech Mono'",marginTop:"6px"}}>ETH · BSC · SOLANA · BASE · ARB</div>
                </div>
              )}
            </div>
          )}

          {/* TRENDING */}
          {nav==="TRENDING"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",letterSpacing:"2px",marginBottom:"4px"}}>&gt; TOP TRENDING TOKENS</div>
              <div style={{fontSize:"10px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"16px"}}>Powered by DexScreener · Klik untuk analisis</div>
              {trendLoading&&<div style={{textAlign:"center",padding:"40px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"12px"}}><div style={{fontSize:"24px",animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</div></div>}
              {!trendLoading&&trending.map((t,i)=>(
                <div key={t.ca} onClick={()=>handleTrendClick(t)}
                  style={{padding:"14px",background:selTrend?.ca===t.ca?C.primaryDim:C.surface,border:`1px solid ${selTrend?.ca===t.ca?C.primary:C.border}`,borderRadius:"10px",marginBottom:"10px",cursor:"pointer",transition:"all 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                    <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue'",fontSize:"14px",color:"#fff",flexShrink:0,overflow:"hidden"}}>
                      {t.icon?<img src={t.icon} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span>{i+1}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:"16px",color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                        <span style={{fontSize:"8px",padding:"1px 6px",borderRadius:"20px",background:`${t.chainColor}22`,color:t.chainColor,border:`1px solid ${t.chainColor}44`,fontFamily:"'Share Tech Mono'",flexShrink:0}}>{t.chainLabel}</span>
                      </div>
                      <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>{t.ca.slice(0,20)}...</div>
                    </div>
                    <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",flexShrink:0}}>→</div>
                  </div>
                  {selTrend?.ca===t.ca&&(
                    <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${C.border}`}}>
                      {trendLoad2&&<div style={{textAlign:"center",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"11px",padding:"8px"}}><span style={{animation:"blink 0.7s infinite",display:"inline-block"}}>▋</span> ANALYZING...</div>}
                      {trendRes&&(
                        <div style={{display:"flex",flexDirection:"column",gap:"8px",animation:"fadeUp 0.3s ease"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px",background:C.card,borderRadius:"8px"}}>
                            <div style={{position:"relative",flexShrink:0}}>
                              <svg width="48" height="48" style={{transform:"rotate(-90deg)"}}>
                                <circle cx="24" cy="24" r="19" fill="none" stroke={C.dim} strokeWidth="4"/>
                                <circle cx="24" cy="24" r="19" fill="none" stroke={scoreColor(trendRes.score)} strokeWidth="4"
                                  strokeDasharray="119" strokeDashoffset={119-(trendRes.score/100)*119} strokeLinecap="round"/>
                              </svg>
                              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <span style={{fontFamily:"'Bebas Neue'",fontSize:"13px",color:scoreColor(trendRes.score)}}>{trendRes.score}</span>
                              </div>
                            </div>
                            <div style={{flex:1}}>
                              {trendRes.dex&&<>
                                <div style={{fontSize:"9px",color:C.text,fontFamily:"'Share Tech Mono'",marginBottom:"2px"}}>$ {trendRes.dex.price?parseFloat(trendRes.dex.price).toFixed(8):"—"}</div>
                                <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>MC: {trendRes.dex.mcap} · LP: {trendRes.dex.lp_size}</div>
                              </>}
                            </div>
                            <div style={{padding:"3px 8px",borderRadius:"4px",background:`${labelColor(trendRes.label)}22`,border:`1px solid ${labelColor(trendRes.label)}`,color:labelColor(trendRes.label),fontFamily:"'Bebas Neue'",fontSize:"11px"}}>{trendRes.label}</div>
                          </div>
                          {trendRes.gp&&[
                            {label:"Honeypot",val:trendRes.gp.honeypot,bool:true,invert:true},
                            {label:"Renounced",val:trendRes.gp.renounced,bool:true},
                            {label:"LP Locked",val:trendRes.gp.lp_locked,bool:true},
                            {label:"Sell Tax",val:`${trendRes.gp.sell_tax.toFixed(1)}%`,warn:trendRes.gp.sell_tax>5},
                          ].map(r=><Row key={r.label} {...r}/>)}
                          {trendRes.dex?.dexUrl&&<a href={trendRes.dex.dexUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",padding:"10px",background:C.primaryDim,border:`1px solid ${C.borderGlow}44`,borderRadius:"6px",color:C.primary,textDecoration:"none",fontFamily:"'Bebas Neue'",fontSize:"12px",letterSpacing:"2px",textAlign:"center"}}>VIEW ON DEXSCREENER ↗</a>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* NEWS */}
          {nav==="NEWS"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div>
                  <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",letterSpacing:"2px"}}>&gt; LIVE CRYPTO NEWS</div>
                  <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginTop:"2px"}}>Cointelegraph · Decrypt · CoinDesk</div>
                </div>
                <button onClick={()=>setNewsLoaded(false)} style={{padding:"6px 12px",background:C.primaryDim,border:`1px solid ${C.borderGlow}44`,borderRadius:"6px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"9px",cursor:"pointer"}}>↻ REFRESH</button>
              </div>
              {newsLoading&&<div style={{textAlign:"center",padding:"40px",color:C.primary,fontFamily:"'Share Tech Mono'"}}><div style={{fontSize:"24px",animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</div></div>}
              {!newsLoading&&news.map((n,i)=>(
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                  <div style={{padding:"14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",marginBottom:"10px",transition:"all 0.2s"}}
                    onMouseOver={e=>e.currentTarget.style.borderColor=C.primary}
                    onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{display:"flex",gap:"6px",marginBottom:"6px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"8px",padding:"1px 6px",borderRadius:"3px",background:`${n.sentiment==="bullish"?C.green:n.sentiment==="bearish"?C.red:C.muted}22`,color:n.sentiment==="bullish"?C.green:n.sentiment==="bearish"?C.red:C.muted,fontFamily:"'Share Tech Mono'",border:`1px solid ${n.sentiment==="bullish"?C.green:n.sentiment==="bearish"?C.red:C.muted}44`}}>
                        {n.sentiment==="bullish"?"▲ BULLISH":n.sentiment==="bearish"?"▼ BEARISH":"● NEUTRAL"}
                      </span>
                      <span style={{fontSize:"8px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>{n.source} · {n.time}</span>
                    </div>
                    <div style={{fontSize:"13px",color:C.text,fontFamily:"'Rajdhani',sans-serif",fontWeight:600,lineHeight:1.4}}>{n.title}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* CREATE TOKEN */}
          {nav==="CREATE TOKEN"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",letterSpacing:"2px",marginBottom:"4px"}}>&gt; CREATE YOUR TOKEN</div>
              <div style={{fontSize:"10px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"16px"}}>Powered by pump.fun · Solana only</div>
              <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"18px"}}>
                {[
                  {key:"name",label:"TOKEN NAME",placeholder:"e.g. King Degen"},
                  {key:"ticker",label:"TICKER SYMBOL",placeholder:"e.g. KDGN"},
                  {key:"supply",label:"TOTAL SUPPLY",placeholder:"1000000000"},
                ].map(f=>(
                  <div key={f.key}>
                    <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"5px"}}>{f.label}</div>
                    <input value={token[f.key]} onChange={e=>setToken(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                      style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"10px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"12px",outline:"none"}}
                      onFocus={e=>e.target.style.border=`1px solid ${C.primary}`}
                      onBlur={e=>e.target.style.border=`1px solid ${C.border}`}/>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:"9px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"5px"}}>DESCRIPTION</div>
                  <textarea value={token.desc} onChange={e=>setToken(p=>({...p,desc:e.target.value}))} placeholder="Describe your token..." rows={3}
                    style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"10px 14px",color:C.primary,fontFamily:"'Share Tech Mono'",fontSize:"12px",outline:"none",resize:"vertical"}}
                    onFocus={e=>e.target.style.border=`1px solid ${C.primary}`}
                    onBlur={e=>e.target.style.border=`1px solid ${C.border}`}/>
                </div>
              </div>
              <button onClick={()=>{const p=new URLSearchParams();if(token.name)p.set("name",token.name);if(token.ticker)p.set("ticker",token.ticker);if(token.desc)p.set("description",token.desc);window.open(`https://pump.fun/create?${p.toString()}`,"_blank");}}
                style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"16px",letterSpacing:"3px",cursor:"pointer",animation:"pulse 2s infinite",marginBottom:"10px"}}>
                🚀 LAUNCH ON PUMP.FUN
              </button>
              <div style={{padding:"10px",background:`${C.yellow}11`,border:`1px solid ${C.yellow}33`,borderRadius:"6px",fontSize:"9px",color:C.yellow,fontFamily:"'Share Tech Mono'",lineHeight:1.7}}>
                ⚠ DYOR. Token creation has risks.
              </div>
            </div>
          )}

          {/* PRICING */}
          {nav==="PRICING"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{fontSize:"9px",color:C.primary,fontFamily:"'Share Tech Mono'",letterSpacing:"2px",marginBottom:"4px"}}>&gt; CHOOSE YOUR PLAN</div>
              <div style={{fontSize:"10px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"20px"}}>Pay USDT · Kode aktivasi via email · 1-24 jam</div>
              {[
                {name:"FREE",price:0,color:C.muted,features:["5 scans/day","Basic security check","Trending tokens","Crypto news","Create token"],locked:["100 scans/day","Unlimited scans","Deep analysis"],current:plan==="FREE"},
                {name:"DEGEN",price:9,color:C.primary,features:["100 scans/day","Full security analysis","Contract deep scan","Tokenomics breakdown","On-chain metrics"],locked:["Unlimited scans","Whale alerts"],current:plan==="DEGEN"},
                {name:"WHALE",price:25,color:C.accent,features:["∞ Unlimited scans","All DEGEN features","Whale wallet tracker","Real-time rug alerts","Priority support"],locked:[],current:plan==="WHALE"},
              ].map(p=>(
                <div key={p.name} style={{padding:"18px",background:C.surface,border:`2px solid ${p.current?p.color:`${p.color}44`}`,borderRadius:"14px",marginBottom:"14px",position:"relative",boxShadow:p.current?`0 0 20px ${p.color}22`:"none"}}>
                  {p.current&&<div style={{position:"absolute",top:"-10px",right:"14px",background:p.color,color:"#000",fontFamily:"'Bebas Neue'",fontSize:"10px",padding:"2px 10px",borderRadius:"20px",letterSpacing:"2px"}}>ACTIVE</div>}
                  <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"12px"}}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:"24px",color:p.color,letterSpacing:"3px"}}>{p.name}</div>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:"32px",color:"#fff"}}>{p.price===0?"FREE":`$${p.price}`}</div>
                    {p.price>0&&<div style={{fontSize:"10px",color:C.muted,fontFamily:"'Share Tech Mono'"}}>/month</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"5px",marginBottom:"12px"}}>
                    {p.features.map(f=>(
                      <div key={f} style={{display:"flex",gap:"8px"}}><span style={{color:C.green,fontSize:"11px"}}>✓</span><span style={{fontSize:"12px",color:C.text,fontFamily:"'Rajdhani'",fontWeight:600}}>{f}</span></div>
                    ))}
                    {p.locked.map(f=>(
                      <div key={f} style={{display:"flex",gap:"8px",opacity:0.4}}><span style={{color:C.muted,fontSize:"11px"}}>✗</span><span style={{fontSize:"12px",color:C.muted,fontFamily:"'Rajdhani'"}}>{f}</span></div>
                    ))}
                  </div>
                  {!p.current&&p.price>0&&(
                    <button onClick={()=>setPayModal({plan:p.name,price:p.price})}
                      style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${p.color},${p.name==="DEGEN"?C.accent:"#ff6b35"})`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"3px",cursor:"pointer",animation:"pulse 2s infinite"}}>
                      UPGRADE TO {p.name} →
                    </button>
                  )}
                  {p.current&&<div style={{padding:"10px",background:`${p.color}11`,border:`1px solid ${p.color}33`,borderRadius:"6px",textAlign:"center",fontFamily:"'Share Tech Mono'",fontSize:"10px",color:p.color}}>✓ Plan aktif</div>}
                </div>
              ))}
              <div style={{padding:"16px",background:C.card,border:`1px solid ${C.borderGlow}44`,borderRadius:"12px",textAlign:"center",marginBottom:"10px"}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:"16px",color:C.primary,letterSpacing:"2px",marginBottom:"6px"}}>SUDAH BAYAR?</div>
                <div style={{fontSize:"11px",color:C.muted,fontFamily:"'Share Tech Mono'",marginBottom:"12px"}}>Input kode aktivasi yang dikirim ke emailmu</div>
                <button onClick={()=>setShowActivate(true)}
                  style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${C.primary},${C.accent})`,border:"none",borderRadius:"8px",color:"#fff",fontFamily:"'Bebas Neue'",fontSize:"15px",letterSpacing:"3px",cursor:"pointer"}}>
                  🔓 INPUT KODE AKTIVASI
                </button>
              </div>
              <button onClick={()=>setNav("CHAT")}
                style={{width:"100%",padding:"12px",background:`${C.green}11`,border:`1px solid ${C.green}44`,borderRadius:"8px",color:C.green,fontFamily:"'Bebas Neue'",fontSize:"14px",letterSpacing:"2px",cursor:"pointer"}}>
                💬 TANYA ADMIN DI CHAT
              </button>
            </div>
          )}

          {/* CHAT */}
          {nav==="CHAT"&&<ChatTab/>}

        </div>
      </div>
    </>
  );
}
