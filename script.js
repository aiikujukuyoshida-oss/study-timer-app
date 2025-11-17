// ------------------------------------------------------------
// 学習タイマー「超集中」 script.js（最新版）
// ・一時停止 → 再開ボタン追加（Pause → Resume）
// ・集中終了5秒前チャイム
// ・休憩終了5秒前チャイム
// ------------------------------------------------------------

const volumeSlider = document.getElementById("volume");
const muteCheck = document.getElementById("mute");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const back10Btn = document.getElementById("back10Btn");
const skip10Btn = document.getElementById("skip10Btn");

const phaseText = document.getElementById("phase");
const timeLarge = document.getElementById("timeLarge");
const setInfo = document.getElementById("setInfo");
const statusText = document.getElementById("status");

let sets = [];
let currentSet = 0;
let currentPhase = "focus"; // focus / break
let remaining = 0;
let timer = null;
let isPaused = false;

// ----------------------
// チャイムとBGM
// ----------------------
const chimeNormal = new Audio("chime_normal.mp3");     // 終了時
const chimeWarning = new Audio("chime_warning.mp3");   // 5秒前
const bgm = new Audio("fire.mp3");
bgm.loop = true;

// ----------------------
// 音量とミュート
// ----------------------
function applyVolume() {
  const v = muteCheck.checked ? 0 : parseFloat(volumeSlider.value);
  bgm.volume = v;
  chimeNormal.volume = v;
  chimeWarning.volume = v;
}

volumeSlider.oninput = applyVolume;
muteCheck.onchange = applyVolume;

// ----------------------
// 時間表示
// ----------------------
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ----------------------
// セット読み込み
// ----------------------
function loadSets() {
  const count = Number(document.getElementById("setCountSelect").value);
  sets = [];
  for (let i = 1; i <= count; i++) {
    const f = Number(document.getElementById(`focus_${i}`).value);
    const b = Number(document.getElementById(`break_${i}`).value);
    sets.push({ focus: f, break: b });
  }
}

function updateDisplay() {
  timeLarge.textContent = formatTime(remaining);
  setInfo.textContent = `セット: ${currentSet + 1} / ${sets.length}`;
  phaseText.textContent = currentPhase === "focus" ? "集中中" : "休憩中";
}

// ----------------------
// タイマー開始
// ----------------------
startBtn.onclick = () => {
  if (timer) return;

  bgm.play();
  loadSets();

  currentSet = 0;
  currentPhase = "focus";
  remaining = sets[0].focus;
  isPaused = false;

  statusText.textContent = "";
  startTimer();
};

// ----------------------
// タイマー動作
// ----------------------
function startTimer() {
  updateDisplay();

  timer = setInterval(() => {
    if (isPaused) return;

    remaining--;
    updateDisplay();

    // ★ 5秒前チャイム （集中・休憩共通）
    if (remaining === 5) {
      chimeWarning.play();
    }

    // ★ フェーズ終了
    if (remaining <= 0) {
      chimeNormal.play();

      if (currentPhase === "focus") {
        // 休憩へ
        currentPhase = "break";
        remaining = sets[currentSet].break;
      } else {
        // 集中 → 次のセット
        currentSet++;
        if (currentSet >= sets.length) {
          finishAll();
          return;
        }
        currentPhase = "focus";
        remaining = sets[currentSet].focus;
      }
      updateDisplay();
    }
  }, 1000);
}

// ----------------------
// 完了処理
// ----------------------
function finishAll() {
  clearInterval(timer);
  timer = null;
  bgm.pause();
  bgm.currentTime = 0;
  phaseText.textContent = "完了！";
}

// ----------------------
// 一時停止
// ----------------------
pauseBtn.onclick = () => {
  if (!timer) return;

  // Pause → Resume 切り替え方式
  if (!isPaused) {
    isPaused = true;
    pauseBtn.textContent = "再開";
    bgm.pause();
  } else {
    isPaused = false;
    pauseBtn.textContent = "一時停止";
    bgm.play();
  }
};

// ----------------------
// リセット
// ----------------------
resetBtn.onclick = () => {
  clearInterval(timer);
  timer = null;
  bgm.pause();
  bgm.currentTime = 0;

  pauseBtn.textContent = "一時停止";
  isPaused = false;

  phaseText.textContent = "準備中";
  timeLarge.textContent = "00:00";
  setInfo.textContent = "セット: 0 / 0";
};

// ----------------------
// 手動操作
// ----------------------
prevBtn.onclick = () => {
  if (currentSet > 0) currentSet--;
  currentPhase = "focus";
  remaining = sets[currentSet].focus;
  updateDisplay();
};

nextBtn.onclick = () => {
  if (currentSet < sets.length - 1) currentSet++;
  currentPhase = "focus";
  remaining = sets[currentSet].focus;
  updateDisplay();
};

back10Btn.onclick = () => {
  remaining = Math.max(0, remaining - 10);
  updateDisplay();
};

skip10Btn.onclick = () => {
  remaining += 10;
  updateDisplay();
};
