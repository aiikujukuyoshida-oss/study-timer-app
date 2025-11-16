//======================
//  タイマーの基本設定
//======================
let timer;
let minutes = 20;
let seconds = 0;

// 音声ファイル
const chime = new Audio("chime.mp3");
const startSound = new Audio("start.mp3");

//======================
//  タイマー表示更新
//======================
function updateDisplay() {
  const display = document.getElementById("time");
  display.textContent =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

//======================
//  カウントダウン処理
//======================
function countdown() {
  timer = setInterval(() => {
    if (minutes === 0 && seconds === 0) {
      clearInterval(timer);
      chime.play(); // 時間終了チャイム
      return;
    }

    if (seconds === 0) {
      minutes--;
      seconds = 59;
    } else {
      seconds--;
    }

    updateDisplay();
  }, 1000);
}

//======================
//  スタートボタン
//======================
function startTimer() {
  clearInterval(timer);
  minutes = 20;
  seconds = 0;
  updateDisplay();
  startSound.play(); // スタート音
  countdown();
}
