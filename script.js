/* 完全版 script.js — GitHub Pages 用
   - デフォルトBGM: Fire.mp3 (あなたの assets を参照)
   - チャイム: chime.wav
   - 4秒前チャイム、BGMループ、音量、ミュート、プリセット(3)
   - セット自動進行、自動切替、バックグラウンド考慮(visibilitychange)
*/

const BASE = 'https://aiikujukuyoshida-oss.github.io/study-timer-assets/';
const BGM_LIST = [
  {name:'Fire', file:'Fire.mp3'},
  {name:'Float', file:'Float.mp3'},
  {name:'Gear', file:'Gear.mp3'},
  {name:'Look Back', file:'Look%20Back.mp3'},
  {name:'Milestone', file:'Milestone.mp3'},
  {name:'Stroll', file:'Stroll.mp3'},
  {name:'Way Back', file:'Way%20Back.mp3'},
];

const CHIME_FILE = 'chime.wav';

// DOM
const focusSel = document.getElementById('focusTime');
const breakSel = document.getElementById('breakTime');
const setsSel = document.getElementById('setCount');
const bgmSel = document.getElementById('bgmSelect');
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

const setsList = document.getElementById('setsList');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const back10Btn = document.getElementById('back10Btn');
const skip10Btn = document.getElementById('skip10Btn');

// Audio
let bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.crossOrigin = "anonymous";
const chimeAudio = new Audio(BASE + CHIME_FILE);
chimeAudio.crossOrigin = "anonymous";

// State
let focusMin = 20, breakMin = 5, totalSets = 6;
let currentSet = 1;
let isFocus = true;
let remaining = focusMin * 60;
let timer = null;
let isMuted = false;

// ---- helpers ----
function fillSelect(el, start, end, step, suffix='') {
  el.innerHTML = '';
  for(let v=start; v<=end; v+=step){
    const o=document.createElement('option'); o.value=v; o.textContent=v+suffix; el.appendChild(o);
  }
}
fillSelect(focusSel,5,60,5,'分');
fillSelect(breakSel,5,30,5,'分');
fillSelect(setsSel,1,12,1,'セット');

// bgm list
function populateBgm(){
  bgmSel.innerHTML = '';
  BGM_LIST.forEach(b=>{ const o=document.createElement('option'); o.value=b.file; o.textContent=b.name; bgmSel.appendChild(o); });
  // default: Fire
  bgmSel.value = 'Fire.mp3';
}
populateBgm();

// UI
function secToMMSS(s){
  if(s<0) s=0;
  const m = String(Math.floor(s/60)).padStart(2,'0');
  const sec = String(s % 60).padStart(2,'0');
  return `${m}:${sec}`;
}
function updateUI(){
  timeEl.textContent = secToMMSS(remaining);
  phaseEl.textContent = isFocus ? '集中タイム' : '休憩タイム';
  setInfo.textContent = `セット: ${currentSet} / ${totalSets}`;
  // sets list render
  renderSetsList();
}

// render simple sets list with up/down
function renderSetsList(){
  setsList.innerHTML = '';
  for(let i=1;i<=totalSets;i++){
    const d = document.createElement('div');
    d.className='setItem';
    d.textContent = `#${i}` + (i===currentSet? ' ← 現在':'');
    const up = document.createElement('button'); up.textContent='↑'; up.style.marginLeft='6px';
    const down = document.createElement('button'); down.textContent='↓'; down.style.marginLeft='4px';
    up.onclick = ()=>{ if(i>1){ swapSets(i, i-1);} };
    down.onclick = ()=>{ if(i<totalSets){ swapSets(i, i+1);} };
    d.appendChild(up); d.appendChild(down);
    setsList.appendChild(d);
  }
}

// allow swapping sets order (simple logical swap of labels)
function swapSets(i,j){
  // For now just swap current position if matches
  // If currentSet equals i or j, adjust currentSet accordingly
  if(currentSet===i) currentSet = j;
  else if(currentSet===j) currentSet = i;
  updateUI();
}

// safe audio play wrapper that attempts to unlock audio context
async function safePlay(audioEl){
  if(!audioEl) return;
  try{
    await audioEl.play();
    return;
  }catch(e){
    try{
      const C = window.AudioContext || window.webkitAudioContext;
      if(C){
        const ctx = new C();
        if(ctx.state === 'suspended') await ctx.resume().catch(()=>{});
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.00001, ctx.currentTime);
        o.start(); o.stop(ctx.currentTime + 0.02);
      }
    }catch(_){}
    try{ await audioEl.play(); }catch(_){}
  }
}

// apply volume / mute
function applyVolume(){
  const vol = parseFloat(volumeEl.value);
  bgmAudio.volume = isMuted ? 0 : vol;
  chimeAudio.volume = isMuted ? 0 : vol;
}

// presets (localStorage)
function savePresetSlot(slot){
  const obj = {
    focus: Number(focusSel.value),
    brk: Number(breakSel.value),
    sets: Number(setsSel.value),
    bgm: bgmSel.value,
    volume: Number(volumeEl.value)
  };
  localStorage.setItem(`superfocus_preset_${slot}`, JSON.stringify(obj));
  loadPresetOptions();
  statusEl.textContent = `プリセット${slot}を保存しました`;
}
function loadPresetOptions(){
  presetSelect.innerHTML = '<option value="">プリセットを選択</option>';
  for(let i=1;i<=3;i++){
    const raw = localStorage.getItem(`superfocus_preset_${i}`);
    const o=document.createElement('option'); o.value=i;
    if(raw){
      const p = JSON.parse(raw);
      o.textContent = `P${i}: ${p.focus}分/${p.brk}分/${p.sets}set - ${p.bgm}`;
    } else o.textContent = `P${i}: 空`;
    presetSelect.appendChild(o);
  }
}
function loadPreset(slot){
  const raw = localStorage.getItem(`superfocus_preset_${slot}`);
  if(!raw) return;
  const p = JSON.parse(raw);
  focusSel.value = p.focus; breakSel.value = p.brk; setsSel.value = p.sets;
  bgmSel.value = p.bgm;
  volumeEl.value = p.volume;
  applyVolume();
  statusEl.textContent = `プリセット${slot}を読み込みました`;
}

// init presets UI
save1.onclick = ()=>savePresetSlot(1);
save2.onclick = ()=>savePresetSlot(2);
save3.onclick = ()=>savePresetSlot(3);
presetSelect.onchange = ()=>{ if(presetSelect.value) loadPreset(presetSelect.value); };
loadPresetOptions();

// timer logic
function prepareFromUI(){
  focusMin = Number(focusSel.value);
  breakMin = Number(breakSel.value);
  totalSets = Number(setsSel.value);
  currentSet = 1;
  isFocus = true;
  remaining = focusMin * 60;
  // set bgm src
  const b = bgmSel.value;
  if(b){
    bgmAudio.src = BASE + b;
    bgmAudio.load();
  } else {
    bgmAudio.src = '';
  }
  applyVolume();
  updateUI();
  statusEl.textContent = '準備完了';
}

// tick
function tick(){
  // 4秒前 chime trigger
  if(remaining === 4){
    safePlay(chimeAudio).catch(()=>{});
  }

  remaining = Math.max(0, remaining - 1);
  updateUI();

  if(remaining === 0){
    // end of phase
    // play switch chime
    safePlay(chimeAudio).catch(()=>{});
    if(isFocus){
      // focus -> break
      isFocus = false;
      remaining = breakMin * 60;
      updateUI();
      // continue
    } else {
      // break -> next set
      currentSet++;
      if(currentSet > totalSets){
        // all done
        clearInterval(timer); timer = null;
        try{ bgmAudio.pause(); bgmAudio.currentTime = 0; }catch(e){}
        phaseEl.textContent = '全セット完了';
        statusEl.textContent = '全セット完了（完了音なし）';
        return;
      } else {
        isFocus = true;
        remaining = focusMin * 60;
        updateUI();
      }
    }
  }
}

// interval control
function startInterval(){
  if(timer) return;
  timer = setInterval(tick, 1000);
}
function stopInterval(){
  if(timer){ clearInterval(timer); timer = null; }
}

// wiring
startBtn.onclick = async () => {
  // ensure prepared
  prepareFromUI();
  // audio unlock attempt
  try{ await safePlay(chimeAudio); chimeAudio.pause(); chimeAudio.currentTime = 0; }catch(e){}
  // start bgm if set
  if(bgmAudio.src){
    try{ await safePlay(bgmAudio); }catch(e){}
  }
  startInterval();
  statusEl.textContent = '実行中';
};

pauseBtn.onclick = () => {
  stopInterval();
  try{ bgmAudio.pause(); }catch(e){}
  statusEl.textContent = '一時停止';
};

resetBtn.onclick = () => {
  stopInterval();
  prepareFromUI();
  try{ bgmAudio.pause(); bgmAudio.currentTime = 0; }catch(e){}
  statusEl.textContent = 'リセット';
};

prevBtn.onclick = () => {
  // go to previous phase: if in break, go to focus; if in focus and not first set, go to previous set focus
  if(isFocus){
    if(currentSet>1){
      currentSet--;
      isFocus = true;
      remaining = focusMin * 60;
    }
  } else {
    // currently break -> switch to focus of same set
    isFocus = true;
    remaining = focusMin * 60;
  }
  updateUI();
};

nextBtn.onclick = () => {
  // skip to next phase
  if(isFocus){
    // go to break
    isFocus = false;
    remaining = breakMin * 60;
  } else {
    // break -> next set focus
    currentSet++;
    if(currentSet>totalSets){
      stopInterval();
      statusEl.textContent = '全セット完了';
      phaseEl.textContent = '全セット完了';
      return;
    }
    isFocus = true;
    remaining = focusMin * 60;
  }
  updateUI();
  safePlay(chimeAudio).catch(()=>{});
};

back10Btn.onclick = () => { remaining = Math.max(0, remaining - 10); updateUI(); };
skip10Btn.onclick = () => { remaining = remaining + 10; updateUI(); };

volumeEl.oninput = () => applyVolume();
muteEl.onchange = () => { isMuted = muteEl.checked; applyVolume(); };

// visibility handling: try to keep timer accurate when tab visibility changes
let lastTick = null;
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden'){
    // remember timestamp
    lastTick = Date.now();
  } else if(document.visibilityState === 'visible' && lastTick){
    const delta = Math.floor((Date.now() - lastTick)/1000);
    if(delta>1 && timer){
      // adjust remaining by elapsed seconds
      remaining = Math.max(0, remaining - delta);
      updateUI();
    }
    lastTick = null;
  }
});

// load initial UI defaults and presets
(function init(){
  focusSel.value = 20;
  breakSel.value = 5;
  setsSel.value = 6;
  populateBgm();
  prepareFromUI();
  loadPresetOptions();
  // set default bgm to Fire by default if present
  if(BGM_LIST.length>0){
    bgmSel.value = BGM_LIST[0].file;
  }
  // apply initial volume
  applyVolume();
})();
