const LIMITE_RESISTORES = 3;
const LIMITE_HISTORICO = 10;
const STORAGE_KEY = "thevenin-norton-pwa";

// Coloque seus arquivos .wav em assets/music e escreva os nomes aqui.
// Exemplo: ["tema1.wav", "tema2.wav", "tema3.wav"]
const MUSICAS = ["Msc1.wav", "Msc2.wav", "Msc3.wav", "Msc4.wav", "Msc5.wav", "Msc6.wav", "Msc7.wav"];

const state = {
  voltage: "",
  resistors: [],
  mode: "parallel",
  history: [],
  musicMuted: false,
  volume: 0.35,
  screenSize: "medium"
};

let currentAudio = null;
let deferredInstallPrompt = null;

const screenMain = document.querySelector("#screen-main");
const screenSettings = document.querySelector("#screen-settings");
const voltageInput = document.querySelector("#voltage-input");
const circuitModeInput = document.querySelector("#circuit-mode");
const resistorList = document.querySelector("#resistor-list");
const resistorCount = document.querySelector("#resistor-count");
const resultBox = document.querySelector("#result-box");
const historyBody = document.querySelector("#history-body");
const muteButton = document.querySelector("#mute-button");
const skipButton = document.querySelector("#skip-button");
const volumeControl = document.querySelector("#volume-control");
const volumeValue = document.querySelector("#volume-value");
const screenSizeInput = document.querySelector("#screen-size");
const installButton = document.querySelector("#install-button");

function saveState() {
  state.voltage = voltageInput.value;
  state.resistors = getResistorValuesRaw();
  state.mode = circuitModeInput.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function showScreen(name) {
  screenMain.classList.toggle("active", name === "main");
  screenSettings.classList.toggle("active", name === "settings");
}

function getResistorValuesRaw() {
  return [...resistorList.querySelectorAll("input")].map((input) => input.value);
}

function updateResistorCount() {
  resistorCount.textContent = `${resistorList.children.length}/${LIMITE_RESISTORES}`;
}

function refreshResistorLabels() {
  [...resistorList.querySelectorAll(".resistor-item")].forEach((item, index) => {
    item.querySelector("span").textContent = `Resistor R${index + 1} (ohms)`;
  });
}

function addResistor(value = "") {
  if (resistorList.children.length >= LIMITE_RESISTORES) {
    alert("O limite e de 3 resistores.");
    return;
  }

  const item = document.createElement("div");
  item.className = "resistor-item";

  const label = document.createElement("label");
  label.className = "field";

  const span = document.createElement("span");
  const row = document.createElement("div");
  row.className = "resistor-row";

  const input = document.createElement("input");
  input.type = "number";
  input.step = "any";
  input.inputMode = "decimal";
  input.placeholder = "Ex: 6";
  input.value = value;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-button";
  removeButton.textContent = "X";
  removeButton.setAttribute("aria-label", "Remover resistor");

  removeButton.addEventListener("click", () => {
    item.remove();
    refreshResistorLabels();
    updateResistorCount();
    saveState();
  });

  input.addEventListener("input", saveState);

  row.append(input, removeButton);
  label.append(span, row);
  item.append(label);
  resistorList.append(item);

  refreshResistorLabels();
  updateResistorCount();
  saveState();
}

function calculate() {
  const vfonte = Number(voltageInput.value);
  const valores = getResistorValuesRaw().map(Number);

  if (!Number.isFinite(vfonte)) {
    alert("Digite uma tensao valida.");
    return;
  }

  if (valores.length < 2) {
    alert("Adicione pelo menos 2 resistores.");
    return;
  }

  if (valores.some((value) => !Number.isFinite(value) || value <= 0)) {
    alert("Os resistores devem ser numeros maiores que zero.");
    return;
  }

  const r1 = valores[0];
  const ramoSaida = valores.slice(1);
  const modoTexto = circuitModeInput.value === "series" ? "Serie" : "Paralelo";
  const r2eq = circuitModeInput.value === "series"
    ? ramoSaida.reduce((soma, r) => soma + r, 0)
    : 1 / ramoSaida.reduce((soma, r) => soma + 1 / r, 0);
  const vth = (vfonte * r2eq) / (r1 + r2eq);
  const rth = (r1 * r2eq) / (r1 + r2eq);
  const inorton = vth / rth;

  resultBox.textContent =
    "RESULTADO\n\n" +
    "Terminais de saida: A-B\n" +
    `Configuracao do ramo A-B: ${modoTexto}\n` +
    `Tensao da fonte: ${formatNumber(vfonte)} V\n` +
    `Resistores: ${valores.map(formatNumber).join(", ")} ohms\n` +
    `R2 equivalente: ${r2eq.toFixed(4)} ohms\n\n` +
    `Vth = ${vth.toFixed(4)} V\n` +
    `Rth = ${rth.toFixed(4)} ohms\n` +
    `In = ${inorton.toFixed(6)} A\n` +
    `Rn = ${rth.toFixed(4)} ohms`;

  state.history.push({
    voltage: `${formatNumber(vfonte)} V`,
    resistors: valores.map(formatNumber).join(", "),
    mode: modoTexto,
    vth: `${vth.toFixed(4)} V`,
    rth: `${rth.toFixed(4)} ohms`,
    inorton: `${inorton.toFixed(6)} A`
  });

  state.history = state.history.slice(-LIMITE_HISTORICO);
  renderHistory();
  saveState();
}

function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 6
  });
}

function renderHistory() {
  historyBody.innerHTML = "";

  [...state.history].reverse().forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.voltage}</td>
      <td>${item.resistors}</td>
      <td>${item.mode || "-"}</td>
      <td>${item.vth}</td>
      <td>${item.rth}</td>
      <td>${item.inorton}</td>
    `;
    historyBody.append(row);
  });
}

function applyScreenSize() {
  document.body.classList.remove("size-small", "size-medium", "size-large", "size-fullscreen");
  document.body.classList.add(`size-${state.screenSize}`);

  if (state.screenSize === "fullscreen" && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function randomMusic() {
  if (!MUSICAS.length) {
    return null;
  }

  const file = MUSICAS[Math.floor(Math.random() * MUSICAS.length)];
  return `assets/music/${file}`;
}

function playRandomMusic() {
  const next = randomMusic();
  if (!next) {
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
  }

  currentAudio = new Audio(next);
  currentAudio.volume = state.musicMuted ? 0 : state.volume;
  currentAudio.addEventListener("ended", playRandomMusic);
  currentAudio.play().catch(() => {});
}

function updateMusic() {
  muteButton.textContent = state.musicMuted ? "Desmutar musica" : "Mutar musica";
  volumeControl.value = Math.round(state.volume * 100);
  volumeValue.textContent = `${volumeControl.value}%`;

  if (currentAudio) {
    currentAudio.volume = state.musicMuted ? 0 : state.volume;
  }

  if (state.musicMuted) {
    return;
  }

  if (!currentAudio || currentAudio.paused) {
    playRandomMusic();
  }
}

function skipMusic() {
  playRandomMusic();
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add("hidden");
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.querySelector("#settings-button").addEventListener("click", () => showScreen("settings"));
document.querySelector("#back-button").addEventListener("click", () => showScreen("main"));
document.querySelector("#add-resistor-button").addEventListener("click", () => addResistor());
document.querySelector("#calculator-form").addEventListener("submit", (event) => {
  event.preventDefault();
  calculate();
});
document.querySelector("#clear-history-button").addEventListener("click", () => {
  state.history = [];
  renderHistory();
  saveState();
});

voltageInput.addEventListener("input", saveState);
circuitModeInput.addEventListener("change", saveState);
muteButton.addEventListener("click", () => {
  state.musicMuted = !state.musicMuted;
  saveState();
  updateMusic();
});
skipButton.addEventListener("click", () => {
  skipMusic();
});
volumeControl.addEventListener("input", () => {
  state.volume = Number(volumeControl.value) / 100;
  saveState();
  updateMusic();
});
screenSizeInput.addEventListener("change", () => {
  state.screenSize = screenSizeInput.value;
  saveState();
  applyScreenSize();
});
window.addEventListener("pointerdown", () => updateMusic(), { once: true });

loadState();
voltageInput.value = state.voltage || "";
circuitModeInput.value = state.mode || "parallel";
state.resistors.forEach((value) => addResistor(value));
renderHistory();
screenSizeInput.value = state.screenSize;
applyScreenSize();
updateMusic();
setupInstallPrompt();
registerServiceWorker();
