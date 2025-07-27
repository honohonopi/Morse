// Morse code conversion table
const morseTable = {
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
    0: "-----",
    1: ".----",
    2: "..---",
    3: "...--",
    4: "....-",
    5: ".....",
    6: "-....",
    7: "--...",
    8: "---..",
    9: "----.",
    ".": ".-.-.-",
    ",": "--..--",
    "?": "..--..",
    "/": "-..-.",
    "-": "-....-",
    "(": "-.--.",
    ")": "-.--.-",
};

const hitToleranceRatio = 0.05;

const reverseMorseTable = Object.fromEntries(
    Object.entries(morseTable).map(([k, v]) => [v, k])
);

// Game scenarios
const scenarios = {
    daily: {
        title: "日常会話モード",
        conversations: [
            {
                send: "CQCQCQ DE JH1MRS JH1MRS AR K",
                translation: "CQ（一般呼出し）こちらJH1MRS、どなたかいませんか？",
                receive: "JH1MRS DE JG1LSJ GA OM K",
                receiveTranslation: "JH1MRSさん、こちらJG1LSJ、こんにちは",
            },
            {
                send: "JG1LSJ DE JH1MRS TNX CALL NAME MAARUSU QTH CHOFU AGE 21 K",
                translation:
                    "JG1LSJさん、呼んでくれてありがとう。名前はマールス、調布在住、21歳です",
                receive:
                    "JH1MRS DE JG1LSJ R R NAME RISAJU QTH YOKOHAMA AGE 20 ES DESIGN MAJOR K",
                receiveTranslation:
                    "了解。私はりさじゅう、横浜在住、20歳、デザイン専攻です",
            },
            {
                send: "JG1LSJ DE JH1MRS FB I STUDY TELECOM WX SUNNY 25C K",
                translation:
                    "素晴らしい！私は通信を勉強してます。天気は晴れ、25度です",
                receive: "JH1MRS DE JG1LSJ WX CLOUDY TU QSO MAARUSU CUAGN 73 SK",
                receiveTranslation:
                    "こちらは曇り。交信ありがとうマールスさん。また今度、73",
            },
        ],
    },
    titanic: {
        title: "タイタニック通信モード",
        conversations: [
            {
                send: "CQD CQD CQD DE MGY POSITION 41.44N 50.24W ICEBERG STRUCK SINKING K",
                translation:
                    "遭難信号！こちらタイタニック号。北緯41.44度、西経50.24度。氷山に衝突、沈没中",
                receive: "MGY DE MPA R R RECEIVED YOUR CQD QSL QTH EN ROUTE K",
                receiveTranslation:
                    "タイタニック号、こちらカルパチア号。遭難信号受信、現在向かっています",
            },
            {
                send: "MPA DE MGY FB TU ENGINE ROOM FLOODED NEED IMMEDIATE ASSIST K",
                translation:
                    "カルパチア号、ありがとう。機関室浸水、緊急援助が必要です",
                receive:
                    "MGY DE MPA R R ETA 4 HOURS HOLD POSITION LIFEBOATS READY? K",
                receiveTranslation:
                    "了解。到着予定4時間。その場で待機、救命ボートの準備は？",
            },
            {
                send: "MPA DE MGY R R LIFEBOATS IN USE PEOPLE ABANDON SHIP QRN HEAVY K",
                translation: "救命ボート使用中、乗客は船を放棄。混信が激しいです",
                receive: "MGY DE MPA FB STAY STRONG CUAGN HOPEFULLY 73 SK",
                receiveTranslation: "頑張って！またお会いできることを祈って、73",
            },
        ],
    },
};

// Game state
let currentMode = null;
let currentTurn = 0;
let playerInput = "";
let currentNotes = [];
let notePosition = 0;
let isAnimating = false;
let tapStartTime = 0;
let scores = [];
let audioContext = null;

// Initialize audio context
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
    }
}

// Convert text to morse
function textToMorse(text) {
    return text
        .split("")
        .map((char) => {
            if (char === " ") return " ";
            return morseTable[char.toUpperCase()] || char;
        })
        .join(" ");
}

// Convert morse to text
function morseToText(morse) {
    return morse
        .split(" ")
        .map((code) => {
            if (code === "") return " ";
            return reverseMorseTable[code] || code;
        })
        .join("");
}

// Play morse sound
function playMorseSound(duration) {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
        0.1,
        audioContext.currentTime + 0.01
    );
    gainNode.gain.linearRampToValueAtTime(
        0.1,
        audioContext.currentTime + duration - 0.01
    );
    gainNode.gain.linearRampToValueAtTime(
        0,
        audioContext.currentTime + duration
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Play morse message
async function playMorseMessage(morseCode) {
    if (!audioContext) return;

    const dotDuration = 0.1;
    const dashDuration = 0.3;
    const pauseDuration = 0.1;
    const letterPauseDuration = 0.3;
    const wordPauseDuration = 0.7;

    for (let i = 0; i < morseCode.length; i++) {
        const char = morseCode[i];

        if (char === ".") {
            playMorseSound(dotDuration);
            await new Promise((resolve) =>
                setTimeout(resolve, (dotDuration + pauseDuration) * 1000)
            );
        } else if (char === "-") {
            playMorseSound(dashDuration);
            await new Promise((resolve) =>
                setTimeout(resolve, (dashDuration + pauseDuration) * 1000)
            );
        } else if (char === " ") {
            await new Promise((resolve) =>
                setTimeout(resolve, letterPauseDuration * 1000)
            );
        } else if (char === "/") {
            await new Promise((resolve) =>
                setTimeout(resolve, wordPauseDuration * 1000)
            );
        }
    }
}

// Start game
function startGame(mode) {
    initAudio();
    currentMode = mode;
    currentTurn = 0;
    scores = [];
    playerInput = "";

    document.getElementById("scoreValue").textContent = "0";
    document.getElementById("progressFill").style.width = "0%";

    showScreen("gameScreen");
    setupNextTurn();
}

// Setup next turn
function setupNextTurn() {
    if (currentTurn >= scenarios[currentMode].conversations.length) {
        showResults();
        return;
    }

    const conversation = scenarios[currentMode].conversations[currentTurn];
    const morseCode = textToMorse(conversation.send);

    document.getElementById("opponentMessage").textContent =
        currentTurn === 0
            ? "通信開始..."
            : scenarios[currentMode].conversations[currentTurn - 1]
                .receiveTranslation;

    document.getElementById("playerMorse").textContent = "";
    document.getElementById("playerMessage").textContent = "";

    playerInput = "";
    setupMorseSheet(morseCode);
    updateProgress();
}

// Setup morse sheet
function setupMorseSheet(morseCode) {
    const sheet = document.getElementById("morseSheet");
    sheet.innerHTML = '<div class="sheet-line"></div>';
    sheet.insertAdjacentHTML("beforeend", '<div id="hitLine"></div>');
    sheet.insertAdjacentHTML('beforeend', '<div id="hitArea"></div>');

    currentNotes = [];
    const notes = morseCode.split("");
    let position = sheet.offsetWidth;

    notes.forEach((note, index) => {
        if (note === "." || note === "-") {
            const noteElement = document.createElement("div");
            noteElement.className = "morse-note";      // ※ correct/wrong はまだ付けない
            noteElement.textContent = note;
            noteElement.style.left = position + "px";
            sheet.appendChild(noteElement);

            currentNotes.push({
                element: noteElement,
                symbol: note,
                startX: position,
                collected: false,
            });

            position += 40;
        }
    });
    updateHitOverlay();
    notePosition = 0;
    startAnimation();
}

function skipPassedNotes() {
    const { start } = getHitWindow();  // 判定帯の開始位置
    // notePosition が指すノートが範囲外（start より左）に行ったらスキップ
    while (
        currentNotes[notePosition] &&
        !currentNotes[notePosition].collected &&
        currentNotes[notePosition].startX < start
    ) {
        // 見逃し扱いで collected=true にしておく（必要なら色付けも）
        currentNotes[notePosition].collected = true;
        // advance pointer
        notePosition++;
    }
}

// Start animation
function startAnimation() {
    if (isAnimating) return;
    isAnimating = true;

    function animate() {
        if (!isAnimating) return;

        currentNotes.forEach((note) => {
            note.startX -= 0.5;
            note.element.style.left = note.startX + "px";

            if (note.startX < -30) {
                note.element.style.opacity = "0.3";
            }
        });
        skipPassedNotes();
        requestAnimationFrame(animate);
    }

    animate();
}

// Handle tap button
document
    .getElementById("tapButton")
    .addEventListener("touchstart", handleTapStart);
document
    .getElementById("tapButton")
    .addEventListener("touchend", handleTapEnd);
document
    .getElementById("tapButton")
    .addEventListener("mousedown", handleTapStart);
document
    .getElementById("tapButton")
    .addEventListener("mouseup", handleTapEnd);

function handleTapStart(e) {
    e.preventDefault();
    tapStartTime = Date.now();
}

function handleTapEnd(e) {
    e.preventDefault();
    const duration = Date.now() - tapStartTime;
    const symbol = duration > 150 ? "-" : ".";

    addMorseInput(symbol);
    playMorseSound(symbol === "." ? 0.1 : 0.3);
}

// Add morse input
function addMorseInput(symbol) {
    playerInput += symbol;
    document.getElementById("playerMorse").textContent = playerInput;
    const { start, end } = getHitWindow();
    const target = currentNotes[notePosition];
    if (!target) {
        console.warn("   ⚠️ no target note at this index");
        return;
    }
    if (!target || target.collected) return;
    if (target.startX > start && target.startX < end) {
        if (target.symbol === symbol) {
            target.element.classList.add("correct");
        } else {
            target.element.classList.add("wrong");
        }
        target.collected = true;
        notePosition++;
        return;
    }
}

// Send message
function sendMessage() {
    if (currentTurn >= scenarios[currentMode].conversations.length) return;

    isAnimating = false;

    const conversation = scenarios[currentMode].conversations[currentTurn];
    const correctMorse = textToMorse(conversation.send).replace(/\s/g, "");
    const userMorse = playerInput;

    // Calculate score
    let matches = 0;
    const minLength = Math.min(correctMorse.length, userMorse.length);

    for (let i = 0; i < minLength; i++) {
        if (correctMorse[i] === userMorse[i]) {
            matches++;
        }
    }

    const accuracy =
        minLength > 0 ? Math.round((matches / correctMorse.length) * 100) : 0;
    scores.push(accuracy);

    // Show translation
    document.getElementById("playerMessage").textContent =
        conversation.translation;

    // Play opponent response after delay
    setTimeout(async () => {
        const responseMessage = conversation.receive;
        const responseMorse = textToMorse(responseMessage);

        showStatusMessage("相手からの応答を受信中...", 2000);

        setTimeout(async () => {
            await playMorseMessage(responseMorse.replace(/\s/g, ""));

            currentTurn++;
            setTimeout(() => {
                setupNextTurn();
            }, 1000);
        }, 2000);
    }, 3000);

    updateScore();
}

// Update score
function updateScore() {
    const avgScore =
        scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
    document.getElementById("scoreValue").textContent = avgScore;
}

// Update progress
function updateProgress() {
    const progress =
        (currentTurn / scenarios[currentMode].conversations.length) * 100;
    document.getElementById("progressFill").style.width = progress + "%";
}

// Show status message
function showStatusMessage(message, duration) {
    const statusDiv = document.createElement("div");
    statusDiv.className = "status-message";
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);

    setTimeout(() => {
        document.body.removeChild(statusDiv);
    }, duration);
}

// Show results
function showResults() {
    console.log("▶ showResults() called, scores:", scores, "currentTurn:", currentTurn);
    const avgScore =
        scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

    document.getElementById("finalScore").textContent = avgScore;

    let message = "";
    if (avgScore >= 90) {
        message = "素晴らしい！モールス通信の達人ですね！";
    } else if (avgScore >= 70) {
        message = "とても良い成績です！もう少しで完璧ですね。";
    } else if (avgScore >= 50) {
        message = "良い調子です！練習を続けてみましょう。";
    } else {
        message = "お疲れ様でした！モールス通信は奥が深いですね。";
    }

    document.getElementById("resultMessage").textContent = message;
    showScreen("resultScreen");
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
}

function showStartScreen() {
    showScreen("startScreen");
    isAnimating = false;
}

function restartGame() {
    startGame(currentMode);
}

// Prevent default touch behaviors
document.addEventListener(
    "touchmove",
    function (e) {
        e.preventDefault();
    },
    { passive: false }
);

// Initialize
document.addEventListener("DOMContentLoaded", function () {
    showScreen("startScreen");
});

function getHitWindow() {
    const sheet = document.getElementById("morseSheet");
    const w = sheet.offsetWidth;
    const center = w / 2;
    const delta = w * hitToleranceRatio;
    return {
        start: center - delta,
        end: center + delta
    };
}

function updateHitOverlay() {
    const { start, end } = getHitWindow();
    const overlay = document.getElementById("hitLine");
    if (!hitArea) return;
    hitArea.style.left = start + "px";
    hitArea.style.width = (end - start) + "px";
}

