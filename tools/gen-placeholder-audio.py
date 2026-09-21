"""Generate original 8-bit style placeholder audio. No samples, no sources —
every waveform here is synthesised from scratch."""
import wave, math, struct, os

SR = 22050
OUT = 'public/audio'
os.makedirs(OUT, exist_ok=True)

def write_wav(path, samples):
    """8-bit unsigned mono — authentic for chiptune and half the size."""
    data = bytes(max(0, min(255, int(round(s * 127)) + 128)) for s in samples)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(1); w.setframerate(SR)
        w.writeframes(data)
    return len(data)

def square(t, f, duty=0.5):
    return 1.0 if (t * f) % 1.0 < duty else -1.0

def triangle(t, f):
    x = (t * f) % 1.0
    return 4 * abs(x - 0.5) - 1

def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

# --- theme loop -------------------------------------------------------
# Own composition: a plain vi-IV-I-V turnaround in C, arpeggiated.
BPM = 116
BEAT = 60.0 / BPM
BAR = BEAT * 4
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
BARS_PER_CHORD = 2
total = BAR * BARS_PER_CHORD * len(CHORDS)
n = int(total * SR)

samples = []
step = BEAT / 2          # arpeggio in eighth notes
for i in range(n):
    t = i / SR
    idx = int(t / (BAR * BARS_PER_CHORD)) % len(CHORDS)
    chord = CHORDS[idx]

    # lead: arpeggio climbing through the chord, an octave up
    k = int(t / step)
    lead_midi = chord[k % 3] + 12 + (12 if (k // 3) % 2 else 0)
    env_t = (t % step) / step
    env = math.exp(-4.5 * env_t)
    lead = square(t, note(lead_midi), 0.25) * env * 0.26

    # bass: root of the chord, one note per half bar
    bass_midi = chord[0] - 12
    b_env = math.exp(-1.6 * ((t % (BAR / 2)) / (BAR / 2)))
    bass = triangle(t, note(bass_midi)) * b_env * 0.34

    # pad: soft sustained third, keeps the loop from sounding empty
    pad = square(t, note(chord[1]), 0.5) * 0.05

    s = lead + bass + pad
    # fade the very start and end into each other so the loop is seamless
    fade = int(0.012 * SR)
    if i < fade: s *= i / fade
    if i > n - fade: s *= (n - i) / fade
    samples.append(max(-1.0, min(1.0, s)))

size = write_wav(f'{OUT}/theme.wav', samples)
print(f'theme.wav      {total:5.1f}s  {size/1024:7.1f} KB')

# --- SFX --------------------------------------------------------------
def sfx(path, dur, fn):
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        s = fn(t, t / dur)
        if i > n - 200: s *= (n - i) / 200   # de-click the tail
        out.append(max(-1.0, min(1.0, s)))
    size = write_wav(path, out)
    print(f'{os.path.basename(path):14s} {dur:5.2f}s  {size/1024:7.1f} KB')

# enter: a rising four-step arpeggio
ENTER = [60, 64, 67, 72]
sfx(f'{OUT}/sfx-enter.wav', 0.42,
    lambda t, p: square(t, note(ENTER[min(3, int(p * 4))]), 0.5) * math.exp(-2.2 * p) * 0.55)

# nav click: a short two-tone blip
sfx(f'{OUT}/sfx-nav.wav', 0.09,
    lambda t, p: square(t, note(72 if p < 0.45 else 79), 0.35) * math.exp(-9 * p) * 0.5)

# view toggle: a short descending blip
sfx(f'{OUT}/sfx-toggle.wav', 0.16,
    lambda t, p: square(t, note(74 - 10 * p), 0.4) * math.exp(-6 * p) * 0.5)
