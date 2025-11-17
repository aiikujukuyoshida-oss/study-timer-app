/* 完全版 script.js（GitHub Pages専用）
   - 各セットごとに集中/休憩時間を設定（A方式）
   - 各セットごとに集中BGM / 休憩BGM 選択（C=YES）
   - chime は集中終了4秒前・休憩終了4秒前に必ず鳴らす（chime.wav固定）
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
let bgmAudio = new Audio(); bgmAudio.loop = true; bgmAudio.crossOrigin = "anonymous";
let chimeAudio = new Audio(); chimeAudio.crossOrigin = "anonymous";
chimeAudio.src = BASE + encodeURIComponent(CHIME_FILE);

// state
let setCount = 6;
let sets = []; // array of {focusMin, breakMin, focusBgm, breakBgm}
let currentIndex = 0; // 0-based
let phase = 'focus'; // 'focus' or 'break'
let remaining = 0;
let timer = null;
let isMuted = false;

// populate set count options 1..12
for(let i=1;i<=12;i++){
  const o = document.createElement('option'); o.value=i; o.textContent = i + ' セット';
  setCountSelect.appendChild(o);
}
setCountSelect.value = 6;

// helpers
function secToMMSS(s){ if(s<0) s=0; const m = String(Math.floor(s/60)).padStart(2,'0'); const sec = String(s%60).padStart(2,'0'); return `${m}:${sec}`; }

function createSetRow(i){
  const row = document.createElement('div'); row.className='set-row';
  const label = document.createElement('div'); label.textContent = `#${i}`; label.style.width='40px';
  const focusInp = document.createElement('input'); focusInp.type='number'; focusInp.min=1; focusInp.value=20; focusInp.title='集中(分)';
  const breakInp = document.createElement('input'); breakInp.type='number'; breakInp.min=1; breakInp.value=5; breakInp.title='休憩(分)';
  const focusSel = document.createElement('select');
  const breakSel = document.createElement('select');
  const noneOpt = document.createElement('option'); noneOpt.value=''; noneOpt.textContent='(なし)';
  focusSel.appendChild(noneOpt.cloneNode(true)); breakSel.appendChild(noneOpt.cloneNode(true));
  BGM_LIST.forEach(b=>{ const o=document.createElement('option'); o.value=b.file; o.textContent=b.name; focusSel.appendChild(o); breakSel.appendChild(o.cloneNode(true)); });
  focusSel.value = BGM_LIST[0].file; // default focus BGM = Fire
  row.appendChild(label);
  row.appendChild(focusInp);
  row.appendChild(document.createTextNode('分 → '));
  row.appendChild(breakInp);
  row.appendChild(document.createTextNode('分  集中BGM:'));
  row.appendChild(focusSel);
  row.appendChild(document.createTextNode(' 休憩BGM:'));
  row.appendChild(breakSel);
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
    const f = Math.max(1, Math.floor(Number(s.focusInp.value)||20));
    const b = Math.max(1, Math.floor(Number(s.breakInp.value)||5));
    const fb = s.focusSel.value || '';
    const bb = s.breakSel.value || '';
    arr.push({focusMin:f, breakMin:b, focusBgm:fb, breakBgm:bb});
  }
  return arr;
}

// safe audio play (unlock strategy)
async function safePlay(el){
  if(!el || !el.src) return;
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
  const vol = parseFloat(volumeEl.value);
  bgmAudio.volume = isMuted ? 0 : vol;
  chimeAudio.volume = isMuted ? 0 : vol;
}

// UI update
function updateUI(){
  timeEl.textContent = secToMMSS(remaining);
  phaseEl.textContent = (phase === 'focus') ? '集中タイム' : '休憩タイム';
  setInfo.textContent = `セット: ${Math.min(currentIndex+1, setCount)} / ${setCount}`;
}

// tick handler
function tick(){
  if(remaining === 5){
    // 4秒前チャイム
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
      remaining = cfg.breakMin * UNIT;
      // switch bgm to breakBgm
      setBgmForPhase(cfg.breakBgm);
      updateUI();
      return;
    } else {
      // break finished -> next set
      currentIndex++;
      if(currentIndex >= setCount){
        // all done
        clearInterval(timer); timer = null;
        try{ bgmAudio.pause(); bgmAudio.currentTime = 0; }catch(e){}
        phaseEl.textContent = '全セット完了';
        statusEl.textContent = '全セット完了（完了音なし）';
        return;
      } else {
        phase = 'focus';
        const cfg = CONFIG[currentIndex];
        remaining = cfg.focusMin * UNIT;
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
    bgmAudio.src = '';
    return;
  }
  // raw URL uses encodeURIComponent for filename
  bgmAudio.src = BASE + encodeURIComponent(filename);
  bgmAudio.load();
  applyVolume();
  // try to play - will succeed if user already interacted
  safePlay(bgmAudio).catch(()=>{});
}

let CONFIG = [];

// prepare from UI
function prepare(){
  CONFIG = readSetsConfig();
  setCount = CONFIG.length;
  currentIndex = 0;
  phase = 'focus';
  remaining = CONFIG[0].focusMin * UNIT;
  applyVolume();
  updateUI();
  statusEl.textContent = '準備完了';
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
    bgmAudio.load();
    safePlay(bgmAudio).catch(()=>{});
  }
  timer = setInterval(tick, 1000);
  statusEl.textContent = '実行中';
}
function stopTimer(){
  if(timer){ clearInterval(timer); timer = null; }
  try{ bgmAudio.pause(); }catch(e){}
  statusEl.textContent = '停止';
}

// wiring events
setCountSelect.onchange = ()=>{
  setCount = Number(setCountSelect.value);
  buildSetsUI();
};

startBtn.onclick = async ()=>{
  // すでに動作中なら無視
  if(timer) return;

  // === 再開の場合（remaining が減っている = 一時停止中） ===
  if(remaining > 0 && statusEl.textContent === '停止'){
    startTimer();
    startBtn.textContent = 'スタート';
    return;
  }

  // === 初回スタート ===
  try{ 
    await safePlay(chimeAudio); 
    chimeAudio.pause(); 
    chimeAudio.currentTime = 0; 
  }catch(e){}

  isMuted = muteEl.checked;
  applyVolume();

  CONFIG = readSetsConfig();
  setCount = CONFIG.length;
  currentIndex = 0;
  phase = 'focus';
  remaining = CONFIG[0].focusMin * UNIT;

  // bgm
  if(CONFIG[0].focusBgm){
    bgmAudio.src = BASE + encodeURIComponent(CONFIG[0].focusBgm);
    bgmAudio.load();
    safePlay(bgmAudio).catch(()=>{});
  }

  updateUI();
  startTimer();
  startBtn.textContent = 'スタート';
};

pauseBtn.onclick = ()=>{ stopTimer(); };

resetBtn.onclick = ()=>{ stopTimer(); CONFIG = readSetsConfig(); currentIndex = 0; phase='focus'; remaining = CONFIG[0].focusMin*UNIT; updateUI(); statusEl.textContent='リセット'; try{ bgmAudio.pause(); bgmAudio.currentTime=0;}catch(e){} };

prevBtn.onclick = ()=>{ stopTimer(); if(phase==='break'){ phase='focus'; remaining = CONFIG[currentIndex].focusMin*UNIT; } else { if(currentIndex>0) currentIndex--; phase='focus'; remaining = CONFIG[currentIndex].focusMin*UNIT; } const f = CONFIG[currentIndex]; if(f.focusBgm){ bgmAudio.src = BASE + encodeURIComponent(f.focusBgm); bgmAudio.load(); } updateUI(); };

nextBtn.onclick = ()=>{ stopTimer(); if(phase==='focus'){ phase='break'; remaining = CONFIG[currentIndex].breakMin*UNIT; } else { currentIndex++; if(currentIndex>=setCount){ phaseEl.textContent='全セット完了'; statusEl.textContent='全セット完了'; return; } phase='focus'; remaining = CONFIG[currentIndex].focusMin*UNIT; } const f = CONFIG[currentIndex]; if(phase==='focus' && f.focusBgm){ bgmAudio.src = BASE + encodeURIComponent(f.focusBgm); bgmAudio.load(); } else if(phase==='break' && f.breakBgm){ bgmAudio.src = BASE + encodeURIComponent(f.breakBgm); bgmAudio.load(); } updateUI(); safePlay(chimeAudio).catch(()=>{}); };

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
save1.onclick = ()=>savePreset(1); save2.onclick = ()=>savePreset(2); save3.onclick = ()=>savePreset(3);
function loadPreset(n){
  const raw = localStorage.getItem('superfocus_preset_'+n);
  if(!raw) return;
  const arr = JSON.parse(raw);
  setCountSelect.value = arr.length;
  setCount = arr.length;
  buildSetsUI();
  for(let i=0;i<arr.length;i++){
    const s = arr[i];
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
    const o = document.createElement('option'); o.value = i;
    o.textContent = raw ? `P${i}` : `P${i}（空）`;
    presetSelect.appendChild(o);
  }
})();
