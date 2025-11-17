//-----------------------------------------------------------
// タイマー管理用のグローバル変数
//-----------------------------------------------------------
let timer = null;
let isPaused = false;
let isRunning = false;
let currentSetIndex = 0;
let remainingSeconds = 0;

// 全セット設定を保持
let SET_CONFIG = [];

// チャイム音
const chimeAudio = new Audio("chime.wav");

// BGMリスト
const BGM_LIST = [
  {name: "Fire", file: "fire.mp3"},
  {name: "Ocean", file: "ocean.mp3"},
  {name: "Forest", file: "forest.mp3"},
];

//-----------------------------------------------------------
// UI生成：セット行を作成
//-----------------------------------------------------------
function createSetRow(index) {
  const container = document.getElementById("sets-container");

  const row = document.createElement("div");
  row.className = "set-row";

  row.innerHTML = `
    <div class="set-label">${index + 1} セット</div>

    <div class="set-block">
      <label>集中(分)</label>
      <input type="number" class="focus-time" min="1" value="20">
    </div>

    <div class="set-block">
      <label>集中BGM</label>
      <select class="focus-bgm"></select>
    </div>

    <div class="set-block">
      <label>休憩(分)</label>
      <input type="number" class="break-time" min="1" value="5">
    </div>

    <div class="set-block">
      <label>休憩BGM</label>
      <select class="break-bgm"></select>
    </div>
  `;

  container.appendChild(row);

  // BGM セレクトへ追加
  const focusSel = row.querySelector(".focus-bgm");
  const breakSel = row.querySelector(".break-bgm");

  BGM_LIST.forEach(bgm => {
    const opt1 = document.createElement("option");
    opt1.value = bgm.file;
    opt1.textContent = bgm.name;
    focusSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = bgm.file;
    opt2.textContent = bgm.name;
    breakSel.appendChild(opt2);
  });

  // ❗今回は初期値強制の1行を削除
  // focusSel.value = BGM_LIST[0].file;
  // breakSel.value  = BGM_LIST[0].file;
}

//-----------------------------------------------------------
// セット数変更 → UI再生成
//-----------------------------------------------------------
document.getElementById("set-count").addEventListener("change", (e) => {
  const count = Number(e.target.value);
  const container = document.getElementById("sets-container");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) createSetRow(i);
});

// 初期 4 セット生成（あなたの環境に合わせて変更可）
window.addEventListener("load", () => {
  const count = Number(document.getElementById("set-count").value);
  for (let i = 0; i < count; i++) createSetRow(i);
});

//-----------------------------------------------------------
// 設定を読み取り SET_CONFIG に格納
//-----------------------------------------------------------
function loadConfig() {
  SET_CONFIG = [];
  const rows = document.querySelectorAll(".set-row");

  rows.forEach(row => {
    const focusMin = Number(row.querySelector(".focus-time").value);
    const breakMin = Number(row.querySelector(".break-time").value);
    const focusBGM = row.querySelector(".focus-bgm").value;
    const breakBGM = row.querySelector(".break-bgm").value;

    SET_CONFIG.push({
      focusSec: focusMin * 60,
      breakSec: breakMin * 60,
      focusBGM,
      breakBGM,
    });
  });
}

//-----------------------------------------------------------
// タイマー表示更新
//-----------------------------------------------------------
function updateTimerDisplay(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  document.getElementById("timer-display").textContent = `${m}:${s}`;
}

//-----------------------------------------------------------
// BGM 再生のための Audio 生成
//-----------------------------------------------------------
let bgmAudio = null;

function playBGM(file) {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
  bgmAudio = new Audio(file);
  bgmAudio.loop = true;
  bgmAudio.volume = Number(document.getElementById("bgm-volume").value);
  bgmAudio.play();
}

//-----------------------------------------------------------
// タイマー開始・再開処理
//-----------------------------------------------------------
function startTimer(forceRestart = false) {
  const btn = document.getElementById("start-btn");

  // 初回スタート
  if (!isRunning || forceRestart) {
    loadConfig();                 // 設定読込
    currentSetIndex = 0;
    remainingSeconds = SET_CONFIG[0].focusSec;
    playBGM(SET_CONFIG[0].focusBGM);

    btn.textContent = "一時停止";
    isRunning = true;
    isPaused = false;
  } else {
    // 再開
    btn.textContent = "一時停止";
    isPaused = false;
  }

  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    if (isPaused) return;

    remainingSeconds--;

    // 🔔 5秒前チャイム（集中・休憩共通）
    if (remainingSeconds === 5) chimeAudio.play();

    updateTimerDisplay(remainingSeconds);

    if (remainingSeconds <= 0) {
      switchPhase();
    }
  }, 1000);
}

//-----------------------------------------------------------
// 一時停止
//-----------------------------------------------------------
function pauseTimer() {
  isPaused = true;
  document.getElementById("start-btn").textContent = "再開";
}

//-----------------------------------------------------------
// スタートボタン
//-----------------------------------------------------------
document.getElementById("start-btn").addEventListener("click", () => {
  if (!isRunning || isPaused) {
    startTimer();
  } else {
    pauseTimer();
  }
});

//-----------------------------------------------------------
// フェーズ切替（集中 → 休憩 → 次セット）
//-----------------------------------------------------------
let isFocusPhase = true;

function switchPhase() {
  if (isFocusPhase) {
    // 集中 → 休憩へ
    isFocusPhase = false;
    remainingSeconds = SET_CONFIG[currentSetIndex].breakSec;
    playBGM(SET_CONFIG[currentSetIndex].breakBGM);
  } else {
    // 休憩 → 次セットへ
    isFocusPhase = true;
    currentSetIndex++;

    if (currentSetIndex >= SET_CONFIG.length) {
      // 完了
      clearInterval(timer);
      isRunning = false;
      document.getElementById("start-btn").textContent = "スタート";
      updateTimerDisplay(0);
      return;
    }

    remainingSeconds = SET_CONFIG[currentSetIndex].focusSec;
    playBGM(SET_CONFIG[currentSetIndex].focusBGM);
  }
}

//-----------------------------------------------------------
// リセットボタン
//-----------------------------------------------------------
document.getElementById("reset-btn").addEventListener("click", () => {
  clearInterval(timer);
  isRunning = false;
  isPaused = false;
  document.getElementById("start-btn").textContent = "スタート";
  updateTimerDisplay(0);
});
