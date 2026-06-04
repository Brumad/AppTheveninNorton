const LIMITE_RESISTORES = 5;
const LIMITE_HISTORICO = 10;
const STORAGE_KEY = "thevenin-norton-pwa-v2";

const MUSICAS = ["Msc1.wav", "Msc2.wav", "Msc3.wav", "Msc4.wav", "Msc5.wav", "Msc6.wav", "Msc7.wav"];

const state = {
  voltage: "",
  resistors: [],
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

function normalizeResistor(item, index = 0) {
  if (typeof item === "object" && item !== null) {
    return {
      value: item.value ?? "",
      connection: item.connection === "parallel" ? "parallel" : "series"
    };
  }

  return {
    value: item ?? "",
    connection: index >= 2 ? "parallel" : "series"
  };
}

function getResistorData() {
  return [...resistorList.querySelectorAll(".resistor-item")].map((item, index) => {
    const input = item.querySelector("input");
    return {
      value: input.value,
      connection: index >= 2 ? item.dataset.connection || "series" : "series"
    };
  });
}

function saveState() {
  state.voltage = voltageInput.value;
  state.resistors = getResistorData();
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
    state.resistors = (state.resistors || []).slice(0, LIMITE_RESISTORES).map(normalizeResistor);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function showScreen(name) {
  screenMain.classList.toggle("active", name === "main");
  screenSettings.classList.toggle("active", name === "settings");
}

function updateResistorCount() {
  resistorCount.textContent = `${resistorList.children.length}/${LIMITE_RESISTORES}`;
}

function renderResistors(data = state.resistors) {
  resistorList.innerHTML = "";
  data.slice(0, LIMITE_RESISTORES).map(normalizeResistor).forEach((resistor) => addResistor(resistor.value, resistor.connection, false));
  updateResistorCount();
}

function addResistor(value = "", connection = "series", shouldSave = true) {
  const index = resistorList.children.length;

  if (index >= LIMITE_RESISTORES) {
    alert("O limite e de 5 resistores.");
    return;
  }

  const item = document.createElement("div");
  item.className = "resistor-item";
  item.dataset.connection = index >= 2 ? connection : "series";

  const label = document.createElement("label");
  label.className = "field";

  const span = document.createElement("span");
  span.textContent = `Resistor R${index + 1} (ohms)`;

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
    const updated = getResistorData();
    updated.splice(index, 1);
    state.resistors = updated;
    renderResistors(updated);
    saveState();
  });

  input.addEventListener("input", saveState);

  row.append(input, removeButton);
  label.append(span, row);
  item.append(label);

  if (index === 0) {
    const help = document.createElement("div");
    help.className = "connection-help";
    help.textContent = "Fixo em serie com a fonte.";
    item.append(help);
  } else if (index === 1) {
    const help = document.createElement("div");
    help.className = "connection-help";
    help.textContent = "Inicia o ramo A-B.";
    item.append(help);
  } else {
    item.append(createConnectionControl(item, connection));
  }

  resistorList.append(item);
  updateResistorCount();

  if (shouldSave) {
    saveState();
  }
}

function createConnectionControl(item, connection) {
  const area = document.createElement("div");
  area.className = "connection-area";

  const help = document.createElement("div");
  help.className = "connection-help";
  help.textContent = "Conexao com o equivalente acumulado.";

  const toggle = document.createElement("div");
  toggle.className = "connection-toggle";

  const seriesButton = document.createElement("button");
  seriesButton.type = "button";
  seriesButton.textContent = "Serie";

  const parallelButton = document.createElement("button");
  parallelButton.type = "button";
  parallelButton.textContent = "Paralelo";

  function setConnection(nextConnection, persist = true) {
    item.dataset.connection = nextConnection;
    seriesButton.classList.toggle("active", nextConnection === "series");
    parallelButton.classList.toggle("active", nextConnection === "parallel");

    if (persist) {
      saveState();
    }
  }

  seriesButton.addEventListener("click", () => setConnection("series"));
  parallelButton.addEventListener("click", () => setConnection("parallel"));

  toggle.append(seriesButton, parallelButton);
  area.append(help, toggle);
  setConnection(connection === "parallel" ? "parallel" : "series", false);

  return area;
}

function calcularEquivalenteRamo(resistors) {
  const ramoSaida = resistors.slice(1);
  let equivalente = ramoSaida[0].value;

  for (let index = 1; index < ramoSaida.length; index += 1) {
    const resistor = ramoSaida[index];

    if (resistor.connection === "series") {
      equivalente += resistor.value;
    } else {
      equivalente = (equivalente * resistor.value) / (equivalente + resistor.value);
    }
  }

  return equivalente;
}

function calculate() {
  const vfonte = Number(voltageInput.value);
  const rawResistors = getResistorData();
  const resistors = rawResistors.map((resistor) => ({
    value: Number(resistor.value),
    connection: resistor.connection
  }));

  if (!Number.isFinite(vfonte)) {
    alert("Digite uma tensao valida.");
    return;
  }

  if (resistors.length < 2) {
    alert("Adicione pelo menos 2 resistores.");
    return;
  }

  if (resistors.some((resistor) => !Number.isFinite(resistor.value) || resistor.value <= 0)) {
    alert("Os resistores devem ser numeros maiores que zero.");
    return;
  }

  const r1 = resistors[0].value;
  const req = calcularEquivalenteRamo(resistors);
  const vth = (vfonte * req) / (r1 + req);
  const rth = (r1 * req) / (r1 + req);
  const inorton = vth / rth;
  const connectionsText = formatConnections(resistors);
  const resistorText = resistors.map((resistor, index) => `R${index + 1}=${formatNumber(resistor.value)}`).join(", ");

  resultBox.textContent =
    "RESULTADO\n\n" +
    "Terminais de saida: A-B\n" +
    "Modelo: R1 em serie com a fonte; R2 inicia o ramo A-B; R3+ entram no equivalente acumulado.\n" +
    `Tensao da fonte: ${formatNumber(vfonte)} V\n` +
    `Resistores: ${resistorText} ohms\n` +
    `Conexoes: ${connectionsText}\n` +
    `Req do ramo A-B: ${req.toFixed(4)} ohms\n\n` +
    `Vth = ${vth.toFixed(4)} V\n` +
    `Rth = ${rth.toFixed(4)} ohms\n` +
    `In = ${inorton.toFixed(6)} A\n` +
    `Rn = ${rth.toFixed(4)} ohms`;

  state.history.push({
    voltage: `${formatNumber(vfonte)} V`,
    resistors: resistorText,
    connections: connectionsText,
    req: `${req.toFixed(4)} ohms`,
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

function formatConnections(resistors) {
  return resistors.map((resistor, index) => {
    if (index === 0) {
      return "R1 serie com a fonte";
    }

    if (index === 1) {
      return "R2 inicio do ramo A-B";
    }

    return `R${index + 1} ${resistor.connection === "series" ? "serie" : "paralelo"}`;
  }).join("; ");
}

function renderHistory() {
  historyBody.innerHTML = "";

  [...state.history].reverse().forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.voltage}</td>
      <td>${item.resistors}</td>
      <td>${item.connections || item.mode || "-"}</td>
      <td>${item.req || "-"}</td>
      <td>${item.vth}</td>
      <td>${item.rth}</td>
      <td>${item.inorton}</td>
    `;
    historyBody.append(row);
  });
}

function loadExample() {
  voltageInput.value = "12";
  state.resistors = [
    { value: "10", connection: "series" },
    { value: "5", connection: "series" },
    { value: "3", connection: "parallel" },
    { value: "4", connection: "series" },
    { value: "6", connection: "parallel" }
  ];
  renderResistors(state.resistors);
  saveState();
  calculate();
}

function clearFields() {
  voltageInput.value = "";
  state.resistors = [];
  renderResistors([]);
  resultBox.textContent = "O resultado aparecera aqui.";
  saveState();
}

function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportReport() {
  const content =
    "TheoNor Calculator - Relatorio\n\n" +
    resultBox.textContent +
    "\n\nModelo suportado: fonte DC, R1 em serie com a fonte e ramo A-B por associacao acumulativa.";

  downloadFile("relatorio-theonor.txt", content);
}

function exportHistoryCsv() {
  const header = ["#", "Fonte", "Resistores", "Conexoes", "Req", "Vth", "Rth", "In"];
  const rows = state.history.map((item, index) => [
    index + 1,
    item.voltage,
    item.resistors,
    item.connections || item.mode || "-",
    item.req || "-",
    item.vth,
    item.rth,
    item.inorton
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  downloadFile("historico-theonor.csv", csv, "text/csv;charset=utf-8");
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

  if (!state.musicMuted && (!currentAudio || currentAudio.paused)) {
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
    navigator.serviceWorker.register("sw.js?v=2").catch(() => {});
  }
}

document.querySelector("#settings-button").addEventListener("click", () => showScreen("settings"));
document.querySelector("#back-button").addEventListener("click", () => showScreen("main"));
document.querySelector("#add-resistor-button").addEventListener("click", () => addResistor());
document.querySelector("#example-button").addEventListener("click", loadExample);
document.querySelector("#clear-fields-button").addEventListener("click", clearFields);
document.querySelector("#export-report-button").addEventListener("click", exportReport);
document.querySelector("#export-history-button").addEventListener("click", exportHistoryCsv);

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

muteButton.addEventListener("click", () => {
  state.musicMuted = !state.musicMuted;
  saveState();
  updateMusic();
});

skipButton.addEventListener("click", skipMusic);

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
renderResistors(state.resistors || []);
renderHistory();
screenSizeInput.value = state.screenSize;
applyScreenSize();
updateMusic();
setupInstallPrompt();
registerServiceWorker();
