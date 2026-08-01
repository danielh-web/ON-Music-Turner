const SIGNUP_FORM_URL = "https://forms.gle/8Cswz8dE8sFBPcXh6";

const toggleBtn = document.getElementById("toggle-btn");
const statusEl = document.getElementById("status");
const displayEl = document.getElementById("tuner-display");
const noteLetterEl = document.getElementById("note-letter");
const noteOctaveEl = document.getElementById("note-octave");
const needleEl = document.getElementById("meter-needle");
const centsLabelEl = document.getElementById("cents-label");
const signupLink = document.getElementById("signup-link");
const stringLabelEl = document.getElementById("string-label");
const instrumentButtons = document.querySelectorAll(".instrument-btn");

signupLink.href = SIGNUP_FORM_URL;

let audioContext = null;
let analyser = null;
let mediaStream = null;
let rafId = null;
let listening = false;
let selectedInstrument = "chromatic";

instrumentButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedInstrument = btn.dataset.instrument;
    instrumentButtons.forEach((b) => b.classList.toggle("active", b === btn));
  });
});

function updateDisplay(frequency) {
  if (frequency === -1) {
    centsLabelEl.textContent = "Escuchando...";
    return;
  }

  const result =
    selectedInstrument === "chromatic"
      ? frequencyToNote(frequency)
      : nearestInstrumentString(frequency, selectedInstrument);
  const { noteName, octave, cents } = result;

  if (selectedInstrument === "chromatic") {
    stringLabelEl.classList.add("hidden");
  } else {
    stringLabelEl.textContent = result.label;
    stringLabelEl.classList.remove("hidden");
  }

  noteLetterEl.textContent = noteName;
  noteOctaveEl.textContent = octave;

  const clampedCents = Math.max(-50, Math.min(50, cents));
  const percent = 50 + clampedCents; // 0-100
  needleEl.style.left = `${percent}%`;

  const inTune = Math.abs(cents) <= 5;
  needleEl.classList.toggle("in-tune", inTune);
  centsLabelEl.textContent = inTune
    ? "¡Afinado!"
    : cents > 0
    ? `+${cents} cents (baja un poco)`
    : `${cents} cents (sube un poco)`;
}

function tick() {
  if (!listening) return;
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  const frequency = autocorrelate(buffer, audioContext.sampleRate);
  updateDisplay(frequency);
  rafId = requestAnimationFrame(tick);
}

async function startTuner() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    statusEl.textContent = "No se pudo acceder al micrófono. Revisa los permisos.";
    return;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(analyser);

  listening = true;
  displayEl.classList.remove("hidden");
  statusEl.textContent = "Toca una nota";
  toggleBtn.textContent = "Detener afinador";
  tick();
}

function stopTuner() {
  listening = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  displayEl.classList.add("hidden");
  statusEl.textContent = "Toca el botón y permite el uso del micrófono";
  toggleBtn.textContent = "Iniciar afinador";
}

toggleBtn.addEventListener("click", () => {
  if (listening) {
    stopTuner();
  } else {
    startTuner();
  }
});
