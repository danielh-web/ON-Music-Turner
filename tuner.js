const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

const INSTRUMENT_STRINGS = {
  guitar: [
    { freq: 82.41, note: "E", octave: 2, label: "Cuerda 6 (Mi grave)" },
    { freq: 110.0, note: "A", octave: 2, label: "Cuerda 5 (La)" },
    { freq: 146.83, note: "D", octave: 3, label: "Cuerda 4 (Re)" },
    { freq: 196.0, note: "G", octave: 3, label: "Cuerda 3 (Sol)" },
    { freq: 246.94, note: "B", octave: 3, label: "Cuerda 2 (Si)" },
    { freq: 329.63, note: "E", octave: 4, label: "Cuerda 1 (Mi agudo)" },
  ],
  bass: [
    { freq: 41.2, note: "E", octave: 1, label: "Cuerda 4 (Mi grave)" },
    { freq: 55.0, note: "A", octave: 1, label: "Cuerda 3 (La)" },
    { freq: 73.42, note: "D", octave: 2, label: "Cuerda 2 (Re)" },
    { freq: 98.0, note: "G", octave: 2, label: "Cuerda 1 (Sol)" },
  ],
  ukulele: [
    { freq: 392.0, note: "G", octave: 4, label: "Cuerda 4 (Sol)" },
    { freq: 261.63, note: "C", octave: 4, label: "Cuerda 3 (Do)" },
    { freq: 329.63, note: "E", octave: 4, label: "Cuerda 2 (Mi)" },
    { freq: 440.0, note: "A", octave: 4, label: "Cuerda 1 (La)" },
  ],
  violin: [
    { freq: 196.0, note: "G", octave: 3, label: "Cuerda 4 (Sol)" },
    { freq: 293.66, note: "D", octave: 4, label: "Cuerda 3 (Re)" },
    { freq: 440.0, note: "A", octave: 4, label: "Cuerda 2 (La)" },
    { freq: 659.25, note: "E", octave: 5, label: "Cuerda 1 (Mi)" },
  ],
};

function nearestInstrumentString(frequency, instrumentKey) {
  const strings = INSTRUMENT_STRINGS[instrumentKey];
  if (!strings) return null;

  let closest = strings[0];
  let closestCentsAbs = Infinity;
  let closestCents = 0;
  for (const string of strings) {
    const cents = Math.round(1200 * Math.log2(frequency / string.freq));
    if (Math.abs(cents) < closestCentsAbs) {
      closestCentsAbs = Math.abs(cents);
      closestCents = cents;
      closest = string;
    }
  }

  return {
    noteName: closest.note,
    octave: closest.octave,
    label: closest.label,
    cents: closestCents,
  };
}

function frequencyToNote(frequency) {
  const exactMidi = A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
  const roundedMidi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - roundedMidi) * 100);
  const noteName = NOTE_NAMES[((roundedMidi % 12) + 12) % 12];
  const octave = Math.floor(roundedMidi / 12) - 1;
  return { noteName, octave, cents };
}

function autocorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) {
    return -1;
  }

  let start = 0;
  let end = SIZE - 1;
  const threshold = 0.2;
  while (start < SIZE / 2 && Math.abs(buffer[start]) < threshold) start++;
  while (end > SIZE / 2 && Math.abs(buffer[end]) < threshold) end--;

  const trimmed = buffer.slice(start, end);
  const trimmedSize = trimmed.length;

  const correlations = new Array(trimmedSize).fill(0);
  for (let lag = 0; lag < trimmedSize; lag++) {
    let sum = 0;
    for (let i = 0; i < trimmedSize - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    correlations[lag] = sum;
  }

  let d = 0;
  while (d < trimmedSize - 1 && correlations[d] > correlations[d + 1]) d++;

  let maxIndex = -1;
  let maxValue = -Infinity;
  for (let i = d; i < trimmedSize; i++) {
    if (correlations[i] > maxValue) {
      maxValue = correlations[i];
      maxIndex = i;
    }
  }

  if (maxIndex <= 0) {
    return -1;
  }

  const prev = correlations[maxIndex - 1] ?? correlations[maxIndex];
  const next = correlations[maxIndex + 1] ?? correlations[maxIndex];
  const shift = (next - prev) / (2 * (2 * correlations[maxIndex] - prev - next) || 1);
  const refinedPeriod = maxIndex + (Number.isFinite(shift) ? shift : 0);

  const frequency = sampleRate / refinedPeriod;
  if (frequency < 60 || frequency > 1500) {
    return -1;
  }
  return frequency;
}
