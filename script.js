// ===== 基本変数 =====
let currentSet = 0;
let currentTime = 0;
let timerId = null;
let isRunning = false;
let sets = [];
let audioReady = false;

// チャイム音
const chime = new Audio("chime.mp3");
chime.preload = "auto";

// ===== DOM取得 =====
const setCountSelect = document.getElementById("setCountSelect");
const setsConfig = document.getElementById("setsConfig");
const volume = document.getElementById("volume");
const mute = document.getElementById("mute");
const phase = document.getElementById("phase");
const timeLarge = document.getElementById("timeLarge");
const setInfo = document.getElementById("setInfo");
const statusText = document.getElementById("status");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const back10Btn = document.getElementById("back10Btn");
const skip10Btn = document.getElementById("skip10Btn");

const presetSelect = document.getElementById("presetSelect");
const savePreset1 = document.getElementById("savePreset1");
const savePreset2 = document.getElementById("savePreset2");
const savePreset3 = document.getElementById("savePreset3");

// ===== 音量設定 =====
volume.addEventListener("input", () => {
  chime.volume = volume.value;
});
mute.addEventListener("change", () => {
  chime.muted = mute.checked;
});

// ===== セット数の初期生成 =====
for (let i = 1; i <= 20; i++) {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = i;
  setCountSelect.appendChild(opt);
}
setCountSelect.value = 6;

// ===== セット入力欄生成 =====
function rebuildSetInputs() {
  setsConfig.innerHTML = "";
  const count = Number(setCountSelect.value);
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "set-row";

    row.innerHTML = `
      <span>${i + 1}:</span>
      <input type="number" class="focusMin" value="20" /> 分
      <input type="number" class="restMin" value="5" /> 休
    `;
    setsConfig.appendChild(row);
  }
}
setCountSelect.addEventListener("change", rebuildSetInputs);
rebuildSetInputs();

// ===== セット開始 =====
function startTimer() {
  if (!audioReady) {
    chime.play().catch(() => {});
    audioReady = true;
    statusText.textContent = "音が許可されました。";
  }

  sets = [];
  document.querySelectorAll(".set-row").forEach((row) => {
    const focusMin = Number(row.querySelector(".focusMin").value);
    const restMin = Number(row.querySelector(".restMin").value);
    sets.push([focusMin * 60, restMin * 60]);
  });

  currentSet = 0;
  startSet();
}

function startSet() {
  if (currentSet >= sets.length) {
    phase.textContent = "終了！";
    timeLarge.textContent = "00:00";
    return;
  }

  phase.textContent = "超集中";
  currentTime = sets[currentSet][0];
  updateDisplay();

  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => tick("focus"), 1000);
}

function tick(mode) {
  currentTime--;

  if (currentTime <= 0) {
    chime.currentTime = 0;
    chime.play();

    if (mode === "focus") {
      phase.textContent = "休憩";
      currentTime = sets[currentSet][1];
      clearInterval(timerId);
      timerId = setInterval(() => tick("rest"), 1000);
    } else {
      currentSet++;
      startSet();
    }
  }

  updateDisplay();
}

function updateDisplay() {
  const m = String(Math.floor(currentTime / 60)).padStart(2, "0");
  const s = String(currentTime % 60).padStart(2, "0");
  timeLarge.textContent = `${m}:${s}`;
  setInfo.textContent = `セット: ${currentSet + 1} / ${sets.length}`;
}

// ===== ボタン機能 =====
startBtn.addEventListener("click", () => {
  if (!isRunning) {
    isRunning = true;
    startTimer();
  }
});

pauseBtn.addEventListener("click", () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;
  }
});

resetBtn.addEventListener("click", () => {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  phase.textContent = "準備中";
  timeLarge.textContent = "00:00";
  setInfo.textContent = "セット: 0 / 0";
});

back10Btn.addEventListener("click", () => {
  currentTime = Math.max(0, currentTime - 10);
  updateDisplay();
});
skip10Btn.addEventListener("click", () => {
  currentTime += 10;
  updateDisplay();
});

// ===== 前後セット移動 =====
prevBtn.addEventListener("click", () => {
  if (currentSet > 0) {
    currentSet--;
    startSet();
  }
});
nextBtn.addEventListener("click", () => {
  if (currentSet < sets.length - 1) {
    currentSet++;
    startSet();
  }
});
