const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

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
