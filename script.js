/* 修正版 script.js
   - 各セットごとに集中/休憩時間と集中BGM/休憩BGMを選択（両方とも全曲から選択可）
   - chime は集中終了5秒前・休憩終了5秒前に鳴らす（chime.wav固定）
   - 音源は raw.githubusercontent.com の BASE を参照（study-timer-assets）
   - ?debug=1 を付けると「分」を「秒」として扱い、すぐ確認できます
*/

const BASE = 'https://raw.githubusercontent.com/aiikujukuyoshida-oss/study-timer-assets/main/';

const BGM_LIST = [
  {name:'Fire', file:'Fire.mp3'},
  {name:'Float', file:'Float.mp3'},
  {name:'Gear', file:'Gear.mp3'},
  {name:'Look Back', file:'Look Back.mp3'},
  {name:'Milestone', file:'Milestone.mp3'},
  {name:'Stroll', file:'Stroll.mp3'},
  {name:'Way Back', file:'Way Back.mp3'}
];
const CHIME_FILE = 'chime.wav';

// DOM
const setCountSelect = document.getElementById('setCountSelect');
const setsConfig = document.getElementById('setsConfig');
const volumeEl = document.getElementById('volume');
const muteEl = document.getElementById('mute');
const presetSelect = document.getElementById('presetSelect');
const save1 = document.getElementById('savePreset1');
const save2 = document.getElementById('savePreset2');
const save3 = document.getElementById('savePreset3');

const phaseEl = document.getElementById('phase');
const timeEl = document.getElementById('timeLarge');
const setInfo = document.getElementById('setInfo');
const statusEl = document.getElementById('status');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const back10Btn = document.getElementById('back10Btn');
const skip10Btn = document.getElementById('skip10Btn');

// debug mode: ?debug=1 treats "分" as "秒" for instant testing
const isDebug = new URLSearchParams(location.search).get('debug') === '1';
const UNIT = isDebug ? 1 : 60; // multiply minutes by UNIT to get seconds

// audio
let bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.crossOrigin = "anonymous";

let chimeAudio = new Audio();
chimeAudio.crossOrigin = "anonymous";
chimeAudio.src = BASE + encodeURIComponent(CHIME_FILE);

// state
let setCount = 6;
let sets = []; // array of {focusInp, breakInp, focusSel, breakSel}
let currentIndex = 0; // 0-based
let phase = 'focus'; // 'focus' or 'break'
let remaining = 0;
let timer = null;
let isMuted = false;
let CONFIG = [];
let isPaused = false; // true = paused (stoppable), false = running or idle

// populate set count options 1..12
for(let i=1;i<=12;i++){
  const o = document.createElement('option');
  o.value = i;
  o.textContent = i + ' セット';
  setCountSelect.appendChild(o);
}
setCountSelect.value = 6;

// helpers
function secToMMSS(s){
  if(s<0) s=0;
  const m = String(Math.floor(s/60)).padStart(2,'0');
  const sec = String(s%60).padStart(2,'0');
  return `${m}:${sec}`;
}

function createSetRow(i){
  const row = document.createElement('div');
  row.className='set-row';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.alignItems = 'center';

  const label = document.createElement('div');
  label.textContent = `#${i}`;
  label.style.width = '36px';
  label.style.color = '#cfe9ff';

  const focusInp = document.createElement('input');
  focusInp.type = 'number';
  focusInp.min = 1;
  focusInp.value = 20;
  focusInp.title = '集中(分)';
  focusInp.style.width = '70px';
  focusInp.style.padding = '6px';
  focusInp.style.borderRadius = '6px';

  const breakInp = document.createElement('input');
  breakInp.type = 'number';
  breakInp.min = 1;
  breakInp.value = 5;
  breakInp.title = '休憩(分)';
  breakInp.style.width = '70px';
  breakInp.style.padding = '6px';
  breakInp.style.borderRadius = '6px';

  // per-set focus BGM select (全曲)
  const focusSel = document.createElement('select');
  const noneOptF = document.createElement('option');
  noneOptF.value = '';
  noneOptF.textContent = '(なし)';
  focusSel.appendChild(noneOptF);
  BGM_LIST.forEach(b=>{
    const o = document.createElement('option');
    o.value = b.file;
    o.textContent = b.name;
    focusSel.appendChild(o);
  });
  focusSel.value = BGM_LIST[0].file; // default focus = Fire
  focusSel.style.padding = '6px';
  focusSel.style.borderRadius = '6px';

  // per-set break BGM select (全曲)
  const breakSel = document.createElement('select');
  const noneOptB = document.createElement('option');
  noneOptB.value = '';
  noneOptB.textContent = '(なし)';
  breakSel.appendChild(noneOptB);
  BGM_LIST.forEach(b=>{
    const o = document.createElement('option');
    o.value = b.file;
    o.textContent = b.name;
    breakSel.appendChild(o);
  });
  breakSel.value = ''; // default none
  breakSel.style.padding = '6px';
  breakSel.style.borderRadius = '6px';

  // immediate-change behavior: if current set and currently in that phase, change BGM live
  (function(idx, fSel, bSel){
    fSel.onchange = ()=>{
      if(idx-1 === currentIndex && phase === 'focus'){
        setBgmForPhase(fSel.value);
      }
    };
    bSel.onchange = ()=>{
      if(idx-1 === currentIndex && phase === 'break'){
        setBgmForPhase(bSel.value);
      }
    };
  })(i, focusSel, breakSel);

  // append nodes to row
  row.appendChild(label);
  row.appendChild(focusInp);
  row.appendChild(document.createTextNode('分'));
  row.appendChild(document.createTextNode('→'));
  row.appendChild(breakInp);
  row.appendChild(document.createTextNode('分'));
  row.appendChild(document.createTextNode(' 集中BGM:'));
  row.appendChild(focusSel);
  row.appendChild(document.createTextNode(' 休憩BGM:'));
  row.appendChild(breakSel);

  // basic styling for inputs/selects to match theme
  [focusInp, breakInp, focusSel, breakSel].forEach(el=>{
    el.style.background = '#06101a';
    el.style.color = '#fff';
    el.style.border = '1px solid rgba(255,255,255,0.03)';
    el.style.fontWeight = '700';
  });

  return {row, focusInp, breakInp, focusSel, breakSel};
}

function buildSetsUI(){
  setsConfig.innerHTML = '';
  sets = [];
  for(let i=1;i<=setCount;i++){
    const {row, focusInp, breakInp, focusSel, breakSel} = createSetRow(i);
    setsConfig.appendChild(row);
    sets.push({focusInp, breakInp, focusSel, breakSel});
  }
}

// read UI into CONFIG array
function readSetsConfig(){
  const arr = [];
  for(const s of sets){
    const f = Math.max(1, Math.floor(Number(s.focusInp.value) || 20));
    const b = Math.max(1, Math.floor(Number(s.breakInp.value) || 5));
    const fb = (s.focusSel && s.focusSel.value) ? s.focusSel.value : '';
    const bb = (s.breakSel && s.breakSel.value) ? s.breakSel.value : '';
    arr.push({focusMin: f, breakMin: b, focusBgm: fb, breakBgm: bb});
  }
  return arr;
}

// safe audio play (unlock strategy)
async function safePlay(el){
  if(!el) return;
  // allow chime even if src empty
  if(!el.src) {
    try{
      // small WebAudio burst to unlock
      const C = window.AudioContext || window.webkitAudioContext;
      if(C){
        const ctx = new C();
        if(ctx.state === 'suspended') await ctx.resume().catch(()=>{});
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.00001, ctx.currentTime);
        o.start(); o.stop(ctx.currentTime+0.02);
      }
    }catch(_){}
    return;
  }
  try{ await el.play(); return; }catch(e){
    try{
      const C = window.AudioContext || window.webkitAudioContext;
      if(C){
        const ctx = new C();
        if(ctx.state === 'suspended') await ctx.resume().catch(()=>{});
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.00001, ctx.currentTime);
        o.start(); o.stop(ctx.currentTime+0.02);
      }
    }catch(_){}
    try{ await el.play(); }catch(_){}
  }
}

function applyVolume(){
  const vol = parseFloat(volumeEl.value || 0.6);
  // background music respects volume (0..1)
  bgmAudio.volume = isMuted ? 0 : vol;
  // chime louder: full volume (but still mute when muted)
  chimeAudio.volume = isMuted ? 0 : 1.0;
}

// UI update
function updateUI(){
  timeEl.textContent = secToMMSS(remaining);
  phaseEl.textContent = (phase === 'focus') ? '超集中' : '休憩タイム';
  setInfo.textContent = `セット: ${Math.min(currentIndex+1, setCount)} / ${setCount}`;
}

// tick handler
function tick(){
  // play chime at 5 seconds remaining
  if(remaining === 5){
    safePlay(chimeAudio).catch(()=>{});
  }

  remaining = Math.max(0, remaining - 1);
  updateUI();

  if(remaining === 0){
    // end of phase - play chime then switch
    safePlay(chimeAudio).catch(()=>{});
    if(phase === 'focus'){
      // focus -> break
      phase = 'break';
      const cfg = CONFIG[currentIndex];
      remaining = (cfg.breakMin || 0) * UNIT;
      // set bgm for break
      setBgmForPhase(cfg.breakBgm);
      updateUI();
      return;
    } else {
      // break finished -> next set
      currentIndex++;
      if(currentIndex >= setCount){
        // all done
        clearInterval(timer);
        timer = null;
        try{ bgmAudio.pause(); bgmAudio.currentTime = 0; }catch(e){}
        phaseEl.textContent = '全セット完了';
        statusEl.textContent = '全セット完了（完了音なし）';
        startBtn.textContent = 'スタート';
        isPaused = false;
        return;
      } else {
        phase = 'focus';
        const cfg = CONFIG[currentIndex];
        remaining = (cfg.focusMin || 0) * UNIT;
        setBgmForPhase(cfg.focusBgm);
        updateUI();
        return;
      }
    }
  }
}

// set bgm for current phase (filename may be '')
function setBgmForPhase(filename){
  try{ bgmAudio.pause(); }catch(e){}
  if(!filename){
    // stop bgm if none selected
    try{ bgmAudio.src = ''; }catch(e){}
    return;
  }
  bgmAudio.src = BASE + encodeURIComponent(filename);
  try{ bgmAudio.load(); }catch(e){}
  applyVolume();
  // try to play
  safePlay(bgmAudio).catch(()=>{});
}

// prepare from UI
function prepare(){
  CONFIG = readSetsConfig();
  setCount = CONFIG.length;
  currentIndex = 0;
  phase = 'focus';
  remaining = (CONFIG[0] && CONFIG[0].focusMin ? CONFIG[0].focusMin : 20) * UNIT;
  applyVolume();
  updateUI();
  statusEl.textContent = '準備完了';
  startBtn.textContent = 'スタート';
  isPaused = false;
}

// interval control
function startTimer(){
  if(timer) return;
  if(!CONFIG || CONFIG.length===0) prepare();
  // start bgm for current phase
  const curr = CONFIG[currentIndex];
  const filename = (phase==='focus') ? curr.focusBgm : curr.breakBgm;
  if(filename){
    bgmAudio.src = BASE + encodeURIComponent(filename);
    try{ bgmAudio.load(); }catch(e){}
    safePlay(bgmAudio).catch(()=>{});
  }
  timer = setInterval(tick, 1000);
  statusEl.textContent = '実行中';
  startBtn.textContent = 'スタート';
  isPaused = false;
}
function stopTimer(){
  if(timer){ clearInterval(timer); timer = null; }
  try{ bgmAudio.pause(); }catch(e){}
  statusEl.textContent = '停止中（再開可能）';
  startBtn.textContent = '再開';
  isPaused = true;
}

// wiring events
setCountSelect.onchange = ()=>{
  setCount = Number(setCountSelect.value);
  buildSetsUI();
};

// START/RESTART button
startBtn.onclick = async ()=>{
  // if already running do nothing
  if(timer) return;

  // if paused (we were running before) -> resume current remaining
  if(isPaused && remaining > 0){
    // resume timer
    startTimer();
    return;
  }

  // otherwise it's an initial start: unlock audio, read config, start fresh
  try{
    await safePlay(chimeAudio);
    chimeAudio.pause();
    chimeAudio.currentTime = 0;
  }catch(e){}

  isMuted = muteEl.checked;
  applyVolume();

  CONFIG = readSetsConfig();
  setCount = CONFIG.length || 1;
  currentIndex = 0;
  phase = 'focus';
  remaining = (CONFIG[0] && CONFIG[0].focusMin ? CONFIG[0].focusMin : 20) * UNIT;

  // prepare bgm and start
  if(CONFIG[0] && CONFIG[0].focusBgm){
    bgmAudio.src = BASE + encodeURIComponent(CONFIG[0].focusBgm);
    try{ bgmAudio.load(); }catch(e){}
    safePlay(bgmAudio).catch(()=>{});
  } else {
    try{ bgmAudio.pause(); }catch(e){}
  }

  updateUI();
  startTimer();
};

// PAUSE button (一時停止)
pauseBtn.onclick = ()=>{ stopTimer(); };

// RESET button
resetBtn.onclick = ()=>{
  stopTimer();
  CONFIG = readSetsConfig();
  currentIndex = 0;
  phase='focus';
  remaining = (CONFIG[0] && CONFIG[0].focusMin ? CONFIG[0].focusMin : 20) * UNIT;
  updateUI();
  statusEl.textContent='リセット';
  startBtn.textContent = 'スタート';
  isPaused = false;
  try{ bgmAudio.pause(); bgmAudio.currentTime=0;}catch(e){}
};

// Prev / Next / Skip controls
prevBtn.onclick = ()=>{
  stopTimer();
  if(phase==='break'){
    phase='focus';
    remaining = CONFIG[currentIndex].focusMin*UNIT;
  } else {
    if(currentIndex>0) currentIndex--;
    phase='focus';
    remaining = CONFIG[currentIndex].focusMin*UNIT;
  }
  const f = CONFIG[currentIndex];
  if(f && f.focusBgm){ bgmAudio.src = BASE + encodeURIComponent(f.focusBgm); try{ bgmAudio.load(); }catch(e){} }
  updateUI();
};

nextBtn.onclick = ()=>{
  stopTimer();
  if(phase==='focus'){
    phase='break';
    remaining = CONFIG[currentIndex].breakMin*UNIT;
  } else {
    currentIndex++;
    if(currentIndex>=setCount){
      phaseEl.textContent='全セット完了';
      statusEl.textContent='全セット完了';
      startBtn.textContent = 'スタート';
      return;
    }
    phase='focus';
    remaining = CONFIG[currentIndex].focusMin*UNIT;
  }
  const f = CONFIG[currentIndex];
  if(phase==='focus' && f && f.focusBgm){
    bgmAudio.src = BASE + encodeURIComponent(f.focusBgm);
    try{ bgmAudio.load(); }catch(e){}
  } else if(phase==='break' && f && f.breakBgm){
    bgmAudio.src = BASE + encodeURIComponent(f.breakBgm);
    try{ bgmAudio.load(); }catch(e){}
  }
  updateUI();
  safePlay(chimeAudio).catch(()=>{});
};

back10Btn.onclick = ()=>{ remaining = Math.max(0, remaining - 10); updateUI(); };
skip10Btn.onclick = ()=>{ remaining = remaining + 10; updateUI(); };

volumeEl.oninput = ()=>{ applyVolume(); };
muteEl.onchange = ()=>{ isMuted = muteEl.checked; applyVolume(); };

// presets
function savePreset(n){
  const cfg = readSetsConfig();
  localStorage.setItem('superfocus_preset_'+n, JSON.stringify(cfg));
  statusEl.textContent = `プリセット${n}保存`;
}
save1.onclick = ()=>savePreset(1);
save2.onclick = ()=>savePreset(2);
save3.onclick = ()=>savePreset(3);

function loadPreset(n){
  const raw = localStorage.getItem('superfocus_preset_'+n);
  if(!raw) return;
  const arr = JSON.parse(raw);
  setCountSelect.value = arr.length;
  setCount = arr.length;
  buildSetsUI();
  for(let i=0;i<arr.length;i++){
    const s = arr[i];
    // guard: if sets[i] exists
    if(!sets[i]) continue;
    sets[i].focusInp.value = s.focusMin;
    sets[i].breakInp.value = s.breakMin;
    sets[i].focusSel.value = s.focusBgm || '';
    sets[i].breakSel.value = s.breakBgm || '';
  }
  statusEl.textContent = `プリセット${n}読込`;
}
presetSelect.onchange = ()=>{ if(presetSelect.value) loadPreset(Number(presetSelect.value)); };

// visibility handling to adjust elapsed time
let lastHidden = null;
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='hidden') lastHidden = Date.now();
  else if(lastHidden){
    const delta = Math.floor((Date.now()-lastHidden)/1000);
    if(delta>1 && timer) { remaining = Math.max(0, remaining - delta); updateUI(); }
    lastHidden = null;
  }
});

// init
(function init(){
  setCountSelect.value = 6;
  buildSetsUI();
  applyVolume();
  updateUI();
  // load presets list options
  presetSelect.innerHTML = '<option value="">プリセットを選択</option>';
  for(let i=1;i<=3;i++){
    const raw = localStorage.getItem('superfocus_preset_'+i);
    const o = document.createElement('option');
    o.value = i;
    o.textContent = raw ? `P${i}` : `P${i}（空）`;
    presetSelect.appendChild(o);
  }
  statusEl.textContent = '準備完了';
  startBtn.textContent = 'スタート';
})();
