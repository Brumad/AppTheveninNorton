const LIMITE_RESISTORES = 5;
const LIMITE_HISTORICO = 10;
const STORAGE_KEY = "thevenin-norton-pwa";

// Coloque seus arquivos .wav em assets/music e escreva os nomes aqui.
// Exemplo: ["tema1.wav", "tema2.wav", "tema3.wav"]
const MUSICAS = ["Msc1.wav", "Msc2.wav", "Msc3.wav", "Msc4.wav", "Msc5.wav", "Msc6.wav", "Msc7.wav"];

const state = {
  voltage: "",
  resistors: [],
  connections: [],
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
const exampleButton = document.querySelector("#example-button");
const clearFieldsButton = document.querySelector("#clear-fields-button");
const exportReportButton = document.querySelector("#export-report-button");
const exportCsvButton = document.querySelector("#export-csv-button");
const muteButton = document.querySelector("#mute-button");
const skipButton = document.querySelector("#skip-button");
const volumeControl = document.querySelector("#volume-control");
const volumeValue = document.querySelector("#volume-value");
const screenSizeInput = document.querySelector("#screen-size");
const installButton = document.querySelector("#install-button");

function saveState() {
  state.voltage = voltageInput.value;
  state.resistors = getResistorData().map((item) => item.value);
  state.connections = getResistorData().map((item) => item.connection);
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

function getResistorData() {
  return [...resistorList.querySelectorAll(".resistor-item")].map((item) => {
    const input = item.querySelector("input");
    const activeConnection = item.querySelector(".connection-toggle button.active");

    return {
      value: input.value,
      connection: activeConnection ? activeConnection.dataset.connection : "series"
    };
  });
}

function updateResistorCount() {
  resistorCount.textContent = `${resistorList.children.length}/${LIMITE_RESISTORES}`;
}

function refreshResistorLabels() {
  [...resistorList.querySelectorAll(".resistor-item")].forEach((item, index) => {
    item.querySelector("span").textContent = `Resistor R${index + 1} (ohms)`;
    const help = item.querySelector(".connection-help");
    const toggle = item.querySelector(".connection-toggle");

    if (index === 0) {
      help.textContent = "R1 fixo em serie com a fonte";
      toggle.classList.add("hidden");
    } else if (index === 1) {
      help.textContent = "R2 inicia o ramo A-B";
      toggle.classList.remove("hidden");
      setToggleState(toggle, "series", true);
    } else {
      help.textContent = `R${index + 1} entra no equivalente acumulado`;
      toggle.classList.remove("hidden");
      setToggleState(toggle, getActiveConnection(toggle), false);
    }
  });
}

function getActiveConnection(toggle) {
  const active = toggle.querySelector("button.active");
  return active ? active.dataset.connection : "series";
}

function setToggleState(toggle, connection, isLocked) {
  toggle.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.connection === connection);
    button.disabled = isLocked && button.dataset.connection !== connection;
  });
}

function addResistor(value = "", connection = "series") {
  if (resistorList.children.length >= LIMITE_RESISTORES) {
    alert("O limite e de 5 resistores.");
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

  const connectionArea = document.createElement("div");
  connectionArea.className = "connection-area";

  const connectionHelp = document.createElement("small");
  connectionHelp.className = "connection-help";

  const connectionToggle = document.createElement("div");
  connectionToggle.className = "connection-toggle";

  const seriesButton = document.createElement("button");
  seriesButton.type = "button";
  seriesButton.textContent = "Serie";
  seriesButton.dataset.connection = "series";

  const parallelButton = document.createElement("button");
  parallelButton.type = "button";
  parallelButton.textContent = "Paralelo";
  parallelButton.dataset.connection = "parallel";

  function setConnection(nextConnection) {
    seriesButton.classList.toggle("active", nextConnection === "series");
    parallelButton.classList.toggle("active", nextConnection === "parallel");
    saveState();
  }

  removeButton.addEventListener("click", () => {
    item.remove();
    refreshResistorLabels();
    updateResistorCount();
    saveState();
  });

  input.addEventListener("input", saveState);
  seriesButton.addEventListener("click", () => setConnection("series"));
  parallelButton.addEventListener("click", () => setConnection("parallel"));

  row.append(input, removeButton);
  label.append(span, row);
  connectionToggle.append(seriesButton, parallelButton);
  connectionArea.append(connectionHelp, connectionToggle);
  item.append(label);
  item.append(connectionArea);
  resistorList.append(item);

  setConnection(connection);
  refreshResistorLabels();
  updateResistorCount();
  saveState();
}

function clearFields() {
  voltageInput.value = "";
  resistorList.innerHTML = "";
  resultBox.textContent = "O resultado aparecera aqui.";
  updateResistorCount();
  saveState();
}

function loadExample() {
  clearFields();
  voltageInput.value = "12";
  addResistor("10", "series");
  addResistor("5", "series");
  addResistor("3", "parallel");
  addResistor("4", "series");
  addResistor("6", "parallel");
  saveState();
}

function calculate() {
  const vfonte = Number(voltageInput.value);
  const resistorData = getResistorData();
  const valores = resistorData.map((item) => Number(item.value));

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
  const ramoSaida = resistorData.slice(1).map((item) => ({
    value: Number(item.value),
    connection: item.connection
  }));
  const r2eq = calcularEquivalenteRamo(ramoSaida);
  const conexoesTexto = formatConnections(resistorData);
  const vth = (vfonte * r2eq) / (r1 + r2eq);
  const rth = (r1 * r2eq) / (r1 + r2eq);
  const inorton = vth / rth;

  resultBox.textContent =
    "RESULTADO\n\n" +
    "Terminais de saida: A-B\n" +
    `Conexoes: ${conexoesTexto}\n` +
    `Tensao da fonte: ${formatNumber(vfonte)} V\n` +
    `Resistores: ${valores.map(formatNumber).join(", ")} ohms\n` +
    `Req do ramo A-B: ${r2eq.toFixed(4)} ohms\n\n` +
    `Vth = ${vth.toFixed(4)} V\n` +
    `Rth = ${rth.toFixed(4)} ohms\n` +
    `In = ${inorton.toFixed(6)} A\n` +
    `Rn = ${rth.toFixed(4)} ohms`;

  state.history.push({
    voltage: `${formatNumber(vfonte)} V`,
    resistors: valores.map(formatNumber).join(", "),
    mode: conexoesTexto,
    req: `${r2eq.toFixed(4)} ohms`,
    vth: `${vth.toFixed(4)} V`,
    rth: `${rth.toFixed(4)} ohms`,
    inorton: `${inorton.toFixed(6)} A`
  });

  state.history = state.history.slice(-LIMITE_HISTORICO);
  renderHistory();
  saveState();
}

function calcularEquivalenteRamo(ramoSaida) {
  let equivalente = ramoSaida[0].value;

  for (const resistor of ramoSaida.slice(1)) {
    if (resistor.connection === "series") {
      equivalente += resistor.value;
    } else {
      equivalente = (equivalente * resistor.value) / (equivalente + resistor.value);
    }
  }

  return equivalente;
}

function formatConnections(resistorData) {
  return resistorData.map((item, index) => {
    if (index === 0) {
      return "R1 Serie fonte";
    }

    if (index === 1) {
      return "R2 Base A-B";
    }

    return `R${index + 1} ${item.connection === "series" ? "Serie" : "Paralelo"}`;
  }).join(" | ");
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
      <td>${item.req || "-"}</td>
      <td>${item.vth}</td>
      <td>${item.rth}</td>
      <td>${item.inorton}</td>
    `;
    historyBody.append(row);
  });
}

function exportReport() {
  const lines = [
    "RELATORIO - TheoNor Calculator",
    "",
    "Modelo: R1 em serie com a fonte; R2 inicia o ramo A-B; R3+ entram em serie/paralelo com o equivalente acumulado.",
    "",
    "Resultado atual:",
    resultBox.textContent,
    "",
    "Historico:"
  ];

  if (!state.history.length) {
    lines.push("Nenhum calculo registrado.");
  } else {
    state.history.forEach((item, index) => {
      lines.push(
        `${index + 1}. V=${item.voltage}; R=${item.resistors}; Conexoes=${item.mode || "-"}; Req=${item.req || "-"}; Vth=${item.vth}; Rth=${item.rth}; In=${item.inorton}`
      );
    });
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "relatorio_theonor.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function exportHistoryCsv() {
  const header = ["#", "Tensao", "Resistores", "Conexoes", "Req", "Vth", "Rth", "In"];
  const rows = state.history.map((item, index) => [
    index + 1,
    item.voltage,
    item.resistors,
    item.mode || "-",
    item.req || "-",
    item.vth,
    item.rth,
    item.inorton
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "historico_theonor.csv";
  link.click();
  URL.revokeObjectURL(url);
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
    navigator.serviceWorker.register("sw.js?v=2").catch(() => {});
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
exampleButton.addEventListener("click", loadExample);
clearFieldsButton.addEventListener("click", clearFields);
exportReportButton.addEventListener("click", exportReport);
exportCsvButton.addEventListener("click", exportHistoryCsv);

voltageInput.addEventListener("input", saveState);
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
state.resistors.forEach((item, index) => {
  if (typeof item === "object" && item !== null) {
    addResistor(item.value, item.connection || "series");
    return;
  }

  addResistor(item, state.connections[index] || "series");
});
renderHistory();
screenSizeInput.value = state.screenSize;
applyScreenSize();
updateMusic();
setupInstallPrompt();
registerServiceWorker();
