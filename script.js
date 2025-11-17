let mode = "work"; // work = 集中, break = 休憩
let time = 20 * 60; // 初期は20分
let timer = null;

const modeDisplay = document.getElementById("modeDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const setNum = document.getElementById("setNum");
const workLength = document.getElementById("workLength");
const breakLength = document.getElementById("breakLength");
const bgmSelectWork = document.getElementById("bgmWork");
const bgmSelectBreak = document.getElementById("bgmBreak");

let currentSet = 1;

// --- 音声 ---
const audioChimeWork = new Audio("audio/chime_work.wav");   // 集中終了5秒前
const audioChimeBreak = new Audio("audio/chime_break.wav"); // 休憩終了5秒前

let audioBGM = new Audio();
audioBGM.loop = true;

// --- 時刻表示 ---
function updateDisplay() {
  const m = String(Math.floor(time / 60)).padStart(2, "0");
  const s = String(time % 60).padStart(2, "0");
  timeDisplay.textContent = `${m}:${s}`;
}

// --- BGMの再生（集中/休憩で別の曲） ---
function playBGM() {
  audioBGM.pause();
  audioBGM.currentTime = 0;

  if (mode === "work") {
    audioBGM.src = bgmSelectWork.value;
  } else {
    audioBGM.src = bgmSelectBreak.value;
  }
  audioBGM.play();
}

// --- モード切替 ---
function switchMode() {
  if (mode === "work") {
    mode = "break";
    time = Number(breakLength.value) * 60;
    modeDisplay.textContent = `休憩タイム（${currentSet} / ${setNum.value}）`;
  } else {
    currentSet++;
    if (currentSet > Number(setNum.value)) {
      modeDisplay.textContent = "終了！お疲れさま！";
      audioBGM.pause();
      return;
    }
    mode = "work";
    time = Number(workLength.value) * 60;
    modeDisplay.textContent = `集中タイム（${currentSet} / ${setNum.value}）`;
  }

  playBGM();
  updateDisplay();
}

// --- タイマー開始 ---
startBtn.onclick = () => {
  if (timer !== null) return;

  playBGM();

  timer = setInterval(() => {
    time--;
    updateDisplay();

    // --- 残り5秒でチャイム（集中/休憩で別々） ---
    if (time === 5) {
      if (mode === "work") {
        audioChimeWork.currentTime = 0;
        audioChimeWork.play();
      } else {
        audioChimeBreak.currentTime = 0;
        audioChimeBreak.play();
      }
    }

    if (time <= 0) {
      clearInterval(timer);
      timer = null;
      switchMode();
    }
  }, 1000);
};

// --- 停止 ---
stopBtn.onclick = () => {
  clearInterval(timer);
  timer = null;
  audioBGM.pause();
};

// --- リセット ---
resetBtn.onclick = () => {
  clearInterval(timer);
  timer = null;
  currentSet = 1;

  mode = "work";
  time = Number(workLength.value) * 60;
  modeDisplay.textContent = `集中タイム（1 / ${setNum.value}）`;
  updateDisplay();
  audioBGM.pause();
};

// --- 集中中 / 休憩中にBGM変更即反映 ---
bgmSelectWork.onchange = () => {
  if (mode === "work" && timer !== null) playBGM();
};

bgmSelectBreak.onchange = () => {
  if (mode === "break" && timer !== null) playBGM();
};

updateDisplay();
