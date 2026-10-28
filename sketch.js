// The Reflecting Pool
// p5.js 1.11.3 + ml5.js v1 (handPose). No build step.
// Keys (for you): M mouse mode | D debug | T machine readings | F fullscreen

// ---------- Tuning ----------
const RES = 4;                 // ripple cell size in px. Bigger = faster, softer
const DAMPING = 0.985;         // how long ripples last (0.97 short, 0.99 long)
const WATER_ALPHA = 0.8;       // below 1 leaves short trails

// Letters: every particle is a letter from the oracle's lines
const NUM_PARTICLES = 3500;    // pool of letters (not all visible at once)
const LETTERS_IDLE = 80;       // letters drifting while nobody is at the pool
const LETTERS_ACTIVE = 1800;   // letters drifting once a hand is detected
const NUM_DOTS = 7000;         // plain particles, always flowing (lower first if fps drops)
const GLYPH_PX = 12;           // size of the drifting letters
const LIFE_MIN = 300;          // frames a fragment lives before fading out
const LIFE_MAX = 600;
const FLOW_CELL = 40;          // flow field resolution in px
const NOISE_SCALE = 0.005;
const RIDE = 0.008;            // how much ripples push letters along
const DISPLACE = 0.06;         // how far ripples visually bend the letters
const CREST_K = 0.0025;         // how much ripple crests enlarge and brighten letters

// Thermal color field: cool water underneath, the hand adds heat
const FIELD_STOPS = [
  [0.00, [3, 5, 24]],          // deep navy
  [0.30, [18, 32, 140]],       // blue
  [0.50, [55, 80, 235]],       // bright blue
  [0.65, [125, 90, 230]],      // violet
  [0.80, [240, 105, 140]],     // coral
  [1.00, [255, 195, 160]]      // peach
];
const FIELD_BASE = 0.42;       // strength of the slow cool blobs (0 = black water)
const HEAT_DECAY = 0.985;      // how long the hand's heat lingers

// Answer, spelled by letters pulled out of the water
const ANSWER_PX = 34;          // letter size once in place
const ANSWER_TRACK = 8;        // letter spacing once settled (starts wider)
const ANSWER_MAX_W = 0.8;      // wrap width as a share of the screen

// Idle hand, drawn by letters gathering
const HAND_STEP = 9;           // spacing of letters inside the hand
const HAND_MAX_PTS = 1100;

const PINCH_ON = 0.35;         // pinch closes below this gap / hand-size ratio
const PINCH_OFF = 0.6;         // pinch opens above this
const RELEASE_MS = 200;        // pinch must stay open this long to count as a release (ignores flicker)
const ANSWER_LEAVE_MS = 3000;  // answer stays until the next pinch, or until the hand has been gone this long

// How the water follows the hand
const DRAG_R = 170;            // reach of the hand in px
const DRAG_K = 0.25;           // how much of the hand's motion the water picks up
const PART_K = 0.15;            // gentle parting around the fingertip
const MOMENTUM = 0.92;         // how long the water keeps moving after the hand passes (0.9 short, 0.97 long)
const MAX_DRIFT = 8;
const HOLD_LOST_MS = 900;      // a pinch can hide the fingers from the camera: keep the answer this long if tracking drops
const SMOOTH = 0.45;           // fingertip smoothing (lower = smoother, more lag)
const HAND_GRACE_MS = 300;     // keep a lost hand alive this long
const IDLE_DELAY_MS = 6000;    // no hand this long = back to idle (long, so tracking dropouts don't bring the hand back)
const REVEAL_MS = 1800;        // time for an answer to fully form
const SINK_MS = 2200;          // time for an answer to dissolve

const GLYPH_FONT = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", Menlo, monospace';

const IDLE_LINES = ["Hold a question in your mind", "Then reach over the water"];
const PINCH_HINT = "Pinch to look beneath";

// ---------- Oracle corpus (edit freely; more lines = more variety) ----------
const CORPUS = [
  "Wait for dusk", "Don't listen to your mind", "Listen to no one", "You already know", "Let go",
  "Look again", "Still waters lie", "Currents are changing", "Drift gently", "Be careful. Words echo",
  "Ripple becomes wave", "You are seen", "One path splits", "It is not known", "The truth will reveal itself",
  "It circles back", "What moves stays", "You've already begun", "Choose with certainty", "Think less",
  "You are already in motion", "Stillness is a direction", "A door has closed", "Begin again",
  "Something waits beneath", "The current has passed you by", "All signs point inward", "You will be seen",
  "What you seek is seeking you", "Now is not the time", "You've been here before",
  "It was never about the question", "Change arrives unseen", "The path is dissolving",
  "It unfolds regardless", "You asked too late", "This is your sign", "The answer is yes",
  "The answer is no", "You will know soon", "Rest. It is coming",
  // added lines in the same voice
  "The water remembers what you forgot", "Ask again when the surface is still", "The answer is already moving",
  "You will not like what rises", "What sinks is not lost", "The current knows your name",
  "Look past your own reflection", "Your hands already decided", "The tide turns without you",
  "Patience is the deeper water", "Something is changing beneath you", "The question is heavier than the answer",
  "Let the water settle first", "You are asking the wrong shore", "It is closer than it looks",
  "What you fear is only a reflection", "The answer drifts toward you", "Not yet. The water is still moving",
  "Trust what returns", "Everything you lost is downstream", "The surface lies. The depth does not",
  "You will know it when it stills", "Go where the current is quiet", "It has already happened",
  "Wait. Then wait again", "The path is under the water", "You were never alone in this",
  "Speak less and the answer grows", "What you seek has already passed through you",
  "Turn back once, then never again", "The sign is in your hands", "Let it sink",
  "The answer is in the waiting", "Yes, but not the way you think", "No, and that is a mercy",
  "Someone is already deciding", "Every ripple returns to the shore", "Hold still and see"
];

// Default ghost hand (used until a real hand has been seen). MediaPipe point order.
const DEFAULT_HAND = [
  [0, 0.45],
  [-0.13, 0.36], [-0.24, 0.24], [-0.32, 0.12], [-0.39, 0.02],
  [-0.11, 0.05], [-0.14, -0.15], [-0.16, -0.28], [-0.18, -0.40],
  [0.00, 0.02], [0.00, -0.20], [0.00, -0.34], [0.00, -0.47],
  [0.10, 0.05], [0.13, -0.14], [0.15, -0.27], [0.17, -0.38],
  [0.19, 0.11], [0.24, -0.04], [0.28, -0.14], [0.31, -0.23]
];
const FINGERS = [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const FINGER_W = [1.15, 1, 1.05, 0.95, 0.8];
const PALM = [0, 1, 5, 9, 13, 17];

// ---------- State ----------
let video, handPose;
let hands = [];

let cols, rows, cur, prev, heatF, waterG;    // ripple + heat
let SX = 0, SY = 0;                           // last slope sample
let flowCols, flowRows, flowVX, flowVY, fieldN;
let LUT;                                      // color lookup for the field

// letters
let partX, partY, partO, partC, partAge, partLife, partA, partS, inForm, rX, rY, rB;
let spawnCursor = 0, aliveLetters = 0;
let dotX, dotY, dotO, dotR, dotRY, dotB, dotShade;
let partCrowd;
const OCC_W = 8, OCC_H = 14;         // overlap grid: one letter per cell stays bright
let occ, occCols, occRows;
let LINE_TOKENS = [];
const ALPHA_LEVELS = 6;

// glyph atlas: every character pre-drawn once, then copied (much faster than drawing text)
const ATLAS_PX = 48, ATLAS_FONT_PX = 38;
const atlas = document.createElement("canvas");
let atlasChars = [], charIndex = {}, atlasAdv = [];

let handForm = null, answerForm = null;
const maskCanvas = document.createElement("canvas");

const hand = { present: false, x: 0, y: 0, tx: 0, ty: 0, ratio: 1, speed: 0, vx: 0, vy: 0 };
let openSince = 0;
let partVX, partVY, dotVX, dotVY;
const pinch = { on: false, x: 0, y: 0 };
let jitter = [];
let lastHandTime = -99999;

let session = null;
let answer = null;

let idleA = 1, hintA = 0, closedA = 0;
let mouseMode = false, debug = false, showMachine = true;
let lastMouseMove = -99999;

let chain = {}, startCounts = {};
const END = "__END__";

// ---------- p5 ----------
function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noCursor();
  video = createCapture(VIDEO);
  video.hide();
  handPose.detectStart(video, gotHands);

  LINE_TOKENS = CORPUS.map(tokenize).filter(t => t.length);
  buildLUT();
  buildAtlas();
  // redraw the letters once the web font has loaded
  if (document.fonts) {
    document.fonts.load(`500 ${ATLAS_FONT_PX}px "Space Grotesk"`).then(buildAtlas).catch(() => {});
    document.fonts.load(`10px "IBM Plex Mono"`).catch(() => {});
  }

  initAll();
  buildMarkov(CORPUS);
  background(0);
}

function initAll() {
  handForm = null;
  answerForm = null;
  initRipple();
  initFlow();
  initParticles();
}

function draw() {
  const now = millis();

  readHand(now);
  updateSession(now);
  updatePinch(now);
  stirWater();
  stepRipple();
  renderWater();
  updateAnswer(now);
  updateHandForm(now);

  drawWater();
  drawDots();
  drawLetters();
  drawPrompts(now);
  drawHandMarks();
  drawAnswerData();

  if (debug) drawDebug();
}

// ---------- Hand input ----------
function toCanvas(kp) {
  return {
    x: map(kp.x, 0, video.width, 0, width),
    y: map(kp.y, 0, video.height, 0, height)
  };
}

function readHand(now) {
  if (mouseMode) {
    if (now - lastMouseMove < 3000 || mouseIsPressed) {
      updateHand(mouseX, mouseY, mouseX - 30, mouseY + 30, mouseIsPressed ? 0 : 1, now);
      
    } else {
      hand.present = false;
    }
    return;
  }

  if (hands.length > 0) {
    const h = hands[0];
    const idx = toCanvas(h.index_finger_tip);
    const th = toCanvas(h.thumb_tip);
    const size = dist(h.wrist.x, h.wrist.y, h.middle_finger_mcp.x, h.middle_finger_mcp.y);
    const gap = dist(h.thumb_tip.x, h.thumb_tip.y, h.index_finger_tip.x, h.index_finger_tip.y);
    updateHand(idx.x, idx.y, th.x, th.y, gap / max(size, 1), now);
  } else if (hand.present && now - lastHandTime > HAND_GRACE_MS) {
    if (!pinch.on || now - lastHandTime > HOLD_LOST_MS) hand.present = false;
  }
}

function updateHand(ix, iy, tx, ty, ratio, now) {
  if (!session) startSession(now);
  if (!hand.present) {
    hand.x = ix; hand.y = iy; hand.tx = tx; hand.ty = ty;
  }
  const px = hand.x, py = hand.y;
  hand.x = lerp(hand.x, ix, SMOOTH);
  hand.y = lerp(hand.y, iy, SMOOTH);
  hand.tx = lerp(hand.tx, tx, SMOOTH);
  hand.ty = lerp(hand.ty, ty, SMOOTH);
  hand.speed = dist(px, py, hand.x, hand.y);
  hand.vx = lerp(hand.vx, hand.x - px, 0.5);
  hand.vy = lerp(hand.vy, hand.y - py, 0.5);
  hand.ratio = ratio;
  hand.present = true;
  lastHandTime = now;

  jitter.push(dist(ix, iy, hand.x, hand.y));
  if (jitter.length > 30) jitter.shift();
  session.stir += hand.speed;
}

// ---------- Session loop ----------
function startSession(now) {
  session = { start: now, lastRelease: null, stir: 0, pinches: 0, closed: false };
  jitter = [];
}

function updateSession(now) {
  const idle = !hand.present && !answer && now - lastHandTime > IDLE_DELAY_MS;
  if (idle) session = null;
  idleA = lerp(idleA, idle ? 1 : 0, 0.05);
}

// ---------- Pinch ----------
function updatePinch(now) {
  if (!hand.present) {
    if (pinch.on) releasePinch(now);
    return;
  }
  // any closing motion counts: a pinch or a grab
  const closing = hand.ratio < PINCH_ON;
  const open = hand.ratio > PINCH_OFF;
  if (!open) openSince = now;
  if (!pinch.on && closing) startPinch(now);
  else if (pinch.on && open && now - openSince > RELEASE_MS) releasePinch(now);

  if (pinch.on) {
    setGrabPoint();
  }
}

// a grab reveals at the palm, a pinch between thumb and index
function setGrabPoint() {
  if (mouseMode) { pinch.x = hand.x; pinch.y = hand.y; }
  else { pinch.x = (hand.x + hand.tx) / 2; pinch.y = (hand.y + hand.ty) / 2; }
}

function startPinch(now) {
  pinch.on = true;
  setGrabPoint();
  drop(pinch.x, pinch.y, 24, 300);
  depositHeat(pinch.x, pinch.y, 140, 0.8);
  if (!session || session.closed) return;

  session.pinches++;
  const r = takeReading(now);
  const o = consult(r);
  answer = {
    text: o.text, reading: r, temp: o.temp, confidence: o.confidence,
    level: 0, from: 0, state: "rising", t0: now
  };
  if (answerForm) releaseForm(answerForm);
  answerForm = buildAnswerForm(answer, pinch.x, pinch.y);
}

function releasePinch(now) {
  pinch.on = false;
  if (session) session.lastRelease = now;
  if (answer) answer.releasedAt = now;   // it stays a while, then sinks (see updateAnswer)
}

// ---------- The algorithm reads the hand ----------
function takeReading(now) {
  const since = session.lastRelease !== null ? session.lastRelease : session.start;
  const meanJ = jitter.length ? jitter.reduce((a, b) => a + b, 0) / jitter.length : 0;
  return {
    hesitation: (now - since) / 1000,
    unrest: constrain(meanJ / 8, 0, 1),
    depth: constrain(pinch.y / height, 0, 1),
    drift: constrain(pinch.x / width, 0, 1),
    stir: constrain(session.stir / (width * 3), 0, 1)
  };
}

function consult(r) {
  const temp = 0.6 + r.unrest * 1.4;                         // restless hand = wilder answer
  const maxWords = 4 + floor(constrain(r.hesitation, 0, 5)); // longer hesitation = longer answer
  const out = generate(mulberry32(hashReading(r)), temp, maxWords);
  return { text: out.text, confidence: out.confidence, temp };
}

// Same gesture, same answer: the reading is the seed.
function hashReading(r) {
  let h = 2166136261;
  const parts = [round(r.hesitation * 2), round(r.unrest * 10), round(r.drift * 6), round(r.depth * 4), round(r.stir * 5)];
  for (const v of parts) {
    h ^= v;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Markov chain ----------
function tokenize(line) {
  return line.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
}

function buildMarkov(lines) {
  chain = {};
  startCounts = {};
  for (const line of lines) {
    const words = tokenize(line);
    if (!words.length) continue;
    startCounts[words[0]] = (startCounts[words[0]] || 0) + 1;
    for (let i = 0; i < words.length; i++) {
      const from = words[i];
      const to = i + 1 < words.length ? words[i + 1] : END;
      if (!chain[from]) chain[from] = {};
      chain[from][to] = (chain[from][to] || 0) + 1;
    }
  }
}

function pickWeighted(counts, rng, temp) {
  const keys = Object.keys(counts);
  const weights = keys.map(k => Math.pow(counts[k], 1 / temp));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return { word: keys[i], p: weights[i] / total };
  }
  const last = keys.length - 1;
  return { word: keys[last], p: weights[last] / total };
}

function generate(rng, temp, maxWords) {
  const MIN_WORDS = 3;
  let step = pickWeighted(startCounts, rng, temp);
  const words = [step.word];
  const probs = [step.p];

  while (words.length < maxWords) {
    let next = chain[words[words.length - 1]];
    if (!next) break;
    if (words.length < MIN_WORDS && Object.keys(next).some(k => k !== END)) {
      next = Object.fromEntries(Object.entries(next).filter(([k]) => k !== END));
    }
    step = pickWeighted(next, rng, temp);
    if (step.word === END) break;
    words.push(step.word);
    probs.push(step.p);
  }

  const logSum = probs.reduce((a, p) => a + Math.log(p), 0);
  const confidence = Math.exp(logSum / probs.length);  // geometric mean of each choice
  let text = words.join(" ");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { text, confidence };
}

// ---------- Ripple water + heat ----------
function initRipple() {
  cols = ceil(width / RES);
  rows = ceil(height / RES);
  cur = new Float32Array(cols * rows);
  prev = new Float32Array(cols * rows);
  heatF = new Float32Array(cols * rows);
  if (waterG) waterG.remove();
  waterG = createGraphics(cols, rows);
  waterG.pixelDensity(1);
  waterG.background(3, 5, 24);
}

function buildLUT() {
  LUT = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let k = 0;
    while (k < FIELD_STOPS.length - 2 && v > FIELD_STOPS[k + 1][0]) k++;
    const [p0, c0] = FIELD_STOPS[k], [p1, c1] = FIELD_STOPS[k + 1];
    const t = constrain((v - p0) / (p1 - p0), 0, 1);
    for (let j = 0; j < 3; j++) LUT[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * t;
  }
}

function drop(cx, cy, radius, strength) {
  const gx = floor(cx / RES), gy = floor(cy / RES);
  const r = max(1, floor(radius / RES));
  for (let y = gy - r; y <= gy + r; y++) {
    for (let x = gx - r; x <= gx + r; x++) {
      if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
      const d = sqrt((x - gx) * (x - gx) + (y - gy) * (y - gy));
      if (d <= r) cur[y * cols + x] += strength * (1 - d / r);
    }
  }
}

function depositHeat(cx, cy, radius, amount) {
  const gx = floor(cx / RES), gy = floor(cy / RES);
  const r = max(1, floor(radius / RES));
  for (let y = gy - r; y <= gy + r; y++) {
    for (let x = gx - r; x <= gx + r; x++) {
      if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
      const d = sqrt((x - gx) * (x - gx) + (y - gy) * (y - gy));
      if (d <= r) {
        const i = y * cols + x;
        heatF[i] = min(1, heatF[i] + amount * (1 - d / r) * (1 - d / r));
      }
    }
  }
}

function stirWater() {
  if (hand.present) {
    // moving finger leaves a wake; a still finger pulses gentle rings
    const s = min(hand.speed * 3, 100) + 12 * sin(frameCount * 0.3);
    drop(hand.x, hand.y, 12, s);
    // faster hand = hotter water
    depositHeat(hand.x, hand.y, 70, 0.03 + min(hand.speed, 40) * 0.012);
  }
  if (idleA > 0.5 && random() < 0.03) {
    drop(random(width), random(height), 8, 80);  // light rain while idle
  }
}

function stepRipple() {
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols]) * 0.5 - prev[i]) * DAMPING;
    }
  }
  const t = cur; cur = prev; prev = t;
}

// Field value per cell = slow cool blobs + heat + ripple light, then mapped through the palette.
function renderWater() {
  waterG.loadPixels();
  const px = waterG.pixels;
  for (let y = 1; y < rows - 1; y++) {
    const fy = (y * RES) / FLOW_CELL;
    const y0 = min(floor(fy), flowRows - 2), ty = fy - y0;
    for (let x = 1; x < cols - 1; x++) {
      const fx = (x * RES) / FLOW_CELL;
      const x0 = min(floor(fx), flowCols - 2), tx = fx - x0;
      const a = y0 * flowCols + x0;
      const top = fieldN[a] + (fieldN[a + 1] - fieldN[a]) * tx;
      const bot = fieldN[a + flowCols] + (fieldN[a + flowCols + 1] - fieldN[a + flowCols]) * tx;
      const base = top + (bot - top) * ty;

      const i = y * cols + x;
      const light = max(0, (cur[i - 1] - cur[i + 1]) + (cur[i - cols] - cur[i + cols]));
      const h = heatF[i];
      heatF[i] = h * HEAT_DECAY;

      const v = 0.03 + base * base * FIELD_BASE + h * 0.75 + light * 0.0012;
      const li = (v >= 1 ? 255 : v * 255 | 0) * 3;
      const k = i * 4;
      px[k] = LUT[li];
      px[k + 1] = LUT[li + 1];
      px[k + 2] = LUT[li + 2];
      px[k + 3] = 255;
    }
  }
  waterG.updatePixels();
}

function drawWater() {
  const ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha = WATER_ALPHA;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(waterG.elt, 0, 0, width, height);
  ctx.restore();
}

function slopeAt(x, y) {
  const gx = floor(x / RES), gy = floor(y / RES);
  if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) { SX = 0; SY = 0; return; }
  const i = gy * cols + gx;
  SX = cur[i - 1] - cur[i + 1];
  SY = cur[i - cols] - cur[i + cols];
}

// ---------- Flow field (coarse grid, updated every few frames) ----------
function initFlow() {
  flowCols = ceil(width / FLOW_CELL) + 2;
  flowRows = ceil(height / FLOW_CELL) + 2;
  flowVX = new Float32Array(flowCols * flowRows);
  flowVY = new Float32Array(flowCols * flowRows);
  fieldN = new Float32Array(flowCols * flowRows);
  dotShade = new Float32Array(flowCols * flowRows);
  updateFlow();
}

function updateFlow() {
  const t = frameCount * 0.002;
  for (let y = 0; y < flowRows; y++) {
    for (let x = 0; x < flowCols; x++) {
      const i = y * flowCols + x;
      const px = x * FLOW_CELL, py = y * FLOW_CELL;
      const a = TAU * noise(px * NOISE_SCALE, py * NOISE_SCALE, t);
      flowVX[i] = cos(a);
      flowVY[i] = sin(a);
      const n = noise(px * 0.0025 + 100, py * 0.0025, t * 0.6);
      fieldN[i] = constrain((n - 0.3) / 0.4, 0, 1);   // stretch noise into clear blobs
      dotShade[i] = noise(px * 0.01, py * 0.01);
    }
  }
}

// ---------- Glyph atlas ----------
function buildAtlas() {
  const set = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ'");
  for (const t of LINE_TOKENS) for (const w of t) for (const ch of w) set.add(ch);
  atlasChars = [...set];
  atlas.width = atlasChars.length * ATLAS_PX;
  atlas.height = ATLAS_PX;
  const c = atlas.getContext("2d");
  c.clearRect(0, 0, atlas.width, atlas.height);
  c.font = `500 ${ATLAS_FONT_PX}px ${GLYPH_FONT}`;
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  atlasChars.forEach((ch, i) => {
    charIndex[ch] = i;
    atlasAdv[i] = c.measureText(ch).width / ATLAS_FONT_PX;
    c.fillText(ch, i * ATLAS_PX + ATLAS_PX / 2, ATLAS_PX / 2 + 2);
  });
}

function glyph(ctx, ci, x, y, px) {
  const s = px * ATLAS_PX / ATLAS_FONT_PX;
  ctx.drawImage(atlas, ci * ATLAS_PX, 0, ATLAS_PX, ATLAS_PX, x - s / 2, y - s / 2, s, s);
}

// ---------- Letters: the water itself ----------
function initParticles() {
  const n = NUM_PARTICLES;
  partX = new Float32Array(n); partY = new Float32Array(n); partO = new Float32Array(n);
  partC = new Uint8Array(n); partAge = new Float32Array(n); partLife = new Float32Array(n);
  partA = new Float32Array(n); partS = new Float32Array(n); inForm = new Uint8Array(n);
  rX = new Float32Array(n); rY = new Float32Array(n); rB = new Uint8Array(n);
  partCrowd = new Float32Array(n).fill(1);
  partVX = new Float32Array(n); partVY = new Float32Array(n);
  for (let i = 0; i < n; i++) partO[i] = random(TWO_PI);
  spawnCursor = 0;
  occCols = ceil(width / OCC_W) + 1;
  occRows = ceil(height / OCC_H) + 1;
  occ = new Uint8Array(occCols * occRows);
  for (let k = 0; k < 20; k++) spawnPhrase(true);

  dotX = new Float32Array(NUM_DOTS); dotY = new Float32Array(NUM_DOTS); dotO = new Float32Array(NUM_DOTS);
  dotVX = new Float32Array(NUM_DOTS); dotVY = new Float32Array(NUM_DOTS);
  dotR = new Float32Array(NUM_DOTS); dotRY = new Float32Array(NUM_DOTS); dotB = new Uint8Array(NUM_DOTS);
  for (let i = 0; i < NUM_DOTS; i++) {
    dotX[i] = random(width); dotY[i] = random(height); dotO[i] = random(TWO_PI);
  }
}

// ---------- Dots: the original particle water, moved by the same ripples ----------
function drawDots() {
  const cxm = width / 2, cym = height / 2;
  const f = frameCount * 0.1;
  const box = answer && answer.box ? answer.box : null;
  for (let i = 0; i < NUM_DOTS; i++) {
    let x = dotX[i], y = dotY[i];
    const fx = constrain(floor(x / FLOW_CELL), 0, flowCols - 1);
    const fy = constrain(floor(y / FLOW_CELL), 0, flowRows - 1);
    const fi = fy * flowCols + fx;
    let vx = flowVX[fi], vy = flowVY[fi];
    let sx = 0, sy = 0;
    const gx = floor(x / RES), gy = floor(y / RES);
    if (gx >= 1 && gy >= 1 && gx < cols - 1 && gy < rows - 1) {
      const g = gy * cols + gx;
      sx = cur[g - 1] - cur[g + 1];
      sy = cur[g - cols] - cur[g + cols];
    }
    vx += sx * RIDE;
    vy += sy * RIDE;
    let mx = dotVX[i] * MOMENTUM, my = dotVY[i] * MOMENTUM;
    if (hand.present) {
      const dx = x - hand.x, dy = y - hand.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < DRAG_R && d > 0.001) {
        const fall = (1 - d / DRAG_R) * (1 - d / DRAG_R);
        mx += hand.vx * DRAG_K * fall + (dx / d) * PART_K * fall;
        my += hand.vy * DRAG_K * fall + (dy / d) * PART_K * fall;
      }
    }
    const mm = Math.sqrt(mx * mx + my * my);
    if (mm > MAX_DRIFT) { mx *= MAX_DRIFT / mm; my *= MAX_DRIFT / mm; }
    dotVX[i] = mx; dotVY[i] = my;
    x += vx + mx; y += vy + my;
    if (x < -10 || x > width + 10 || y < -10 || y > height + 10 || Math.random() < 0.004) {
      x = Math.random() * width; y = Math.random() * height;
    }
    dotX[i] = x; dotY[i] = y;
    const dxc = x - cxm, dyc = y - cym;
    const wave = Math.sin(Math.sqrt(dxc * dxc + dyc * dyc) / 20 - f + dotO[i]) * 2;
    dotR[i] = x + sx * DISPLACE;
    dotRY[i] = y + sy * DISPLACE + wave;
    let shade = dotShade[fi] * 0.75 + (sx + sy) * CREST_K;
    if (box && x > box.cx - box.w / 2 - 30 && x < box.cx + box.w / 2 + 30 && y > box.y - 30 && y < box.y + box.h + 80) {
      shade -= 0.6 * answer.level;
    }
    dotB[i] = floor(constrain(shade, 0, 0.999) * 6);
  }
  const ctx = drawingContext;
  for (let b = 0; b < 6; b++) {
    const sz = 2.2 + b * 0.3, h = sz / 2;
    ctx.beginPath();
    for (let i = 0; i < NUM_DOTS; i++) if (dotB[i] === b) ctx.rect(dotR[i] - h, dotRY[i] - h, sz, sz);
    ctx.fillStyle = `rgba(${20 + b * 12},${110 + b * 18},${170 + b * 17},${(0.35 + b * 0.1).toFixed(2)})`;
    ctx.fill();
  }
}

function nextFree() {
  for (let tries = 0; tries < NUM_PARTICLES; tries++) {
    const i = spawnCursor;
    spawnCursor = (spawnCursor + 1) % NUM_PARTICLES;
    if (!inForm[i] && partAge[i] >= partLife[i]) return i;   // a letter that has already faded
  }
  return -1;
}

function occAt(x, y) {
  const cx = floor(x / OCC_W), cy = floor(y / OCC_H);
  if (cx < 0 || cy < 0 || cx >= occCols || cy >= occRows) return -1;
  return cy * occCols + cx;
}

// A fragment of 1 to 3 words from one oracle line surfaces somewhere in the water.
function spawnPhrase(randomAge) {
  const words = LINE_TOKENS[floor(random(LINE_TOKENS.length))];
  const start = floor(random(words.length));
  const phrase = words.slice(start, start + 1 + floor(random(3))).join(" ");
  const life = random(LIFE_MIN, LIFE_MAX);
  const age = randomAge ? random(life) : 0;
  // look for a clear stretch of water so new words don't land on old ones
  const len = phrase.length * GLYPH_PX * 0.62;
  let x = 0, y = 0, count = 0;
  for (let tries = 0; tries < 8; tries++) {
    x = random(10, width - len - 10);
    y = random(10, height - 10);
    let clear = true;
    for (let cx = x - OCC_W; cx < x + len + OCC_W && clear; cx += OCC_W) {
      for (let dy = -OCC_H; dy <= OCC_H; dy += OCC_H) {
        const k = occAt(cx, y + dy);
        if (k >= 0 && occ[k]) { clear = false; break; }
      }
    }
    if (clear) break;
  }
  for (const ch of phrase) {
    const ci = charIndex[ch];
    if (ch === " " || ci === undefined) { x += GLYPH_PX * 0.4; continue; }
    const i = nextFree();
    if (i < 0) break;
    partX[i] = x; partY[i] = y; partC[i] = ci;
    partAge[i] = age; partLife[i] = life;
    x += atlasAdv[ci] * GLYPH_PX + 1;
    count++;
  }
  return count;
}

function drawLetters() {
  if (frameCount % 3 === 0) updateFlow();

  // a few letters while idle; the stream fills once a hand is detected
  const want = session && !session.closed ? LETTERS_ACTIVE : LETTERS_IDLE;
  let spawned = 0, guard = 0;
  const perFrame = want === LETTERS_ACTIVE ? 60 : 4;
  while (aliveLetters + spawned < want && spawned < perFrame && guard++ < 30) spawned += spawnPhrase(false);

  occ.fill(0);
  let alive = 0;

  const cxm = width / 2, cym = height / 2;
  const f = frameCount * 0.1;

  for (let i = 0; i < NUM_PARTICLES; i++) {
    if (!inForm[i]) partAge[i]++;
    const age = partAge[i], life = partLife[i];
    let a = min(1, age / 30) * min(1, (life - age) / 60);
    if (a <= 0 && !inForm[i]) { partA[i] = 0; rB[i] = 255; continue; }
    alive++;

    let x = partX[i], y = partY[i];
    const fx = constrain(floor(x / FLOW_CELL), 0, flowCols - 1);
    const fy = constrain(floor(y / FLOW_CELL), 0, flowRows - 1);
    const fi = fy * flowCols + fx;
    let vx = flowVX[fi], vy = flowVY[fi];

    let sx = 0, sy = 0;
    const gx = floor(x / RES), gy = floor(y / RES);
    if (gx >= 1 && gy >= 1 && gx < cols - 1 && gy < rows - 1) {
      const g = gy * cols + gx;
      sx = cur[g - 1] - cur[g + 1];
      sy = cur[g - cols] - cur[g + cols];
    }
    vx += sx * RIDE;
    vy += sy * RIDE;

    // the hand drags the water with it; the water keeps moving after the hand passes
    let mx = partVX[i] * MOMENTUM, my = partVY[i] * MOMENTUM;
    if (hand.present) {
      const dx = x - hand.x, dy = y - hand.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < DRAG_R && d > 0.001) {
        const fall = (1 - d / DRAG_R) * (1 - d / DRAG_R);
        mx += hand.vx * DRAG_K * fall + (dx / d) * PART_K * fall;
        my += hand.vy * DRAG_K * fall + (dy / d) * PART_K * fall;
      }
    }
    const mm = Math.sqrt(mx * mx + my * my);
    if (mm > MAX_DRIFT) { mx *= MAX_DRIFT / mm; my *= MAX_DRIFT / mm; }
    partVX[i] = mx; partVY[i] = my;

    x += vx + mx; y += vy + my;
    partX[i] = x; partY[i] = y;
    if ((x < -30 || x > width + 30 || y < -30 || y > height + 30) && !inForm[i]) partAge[i] = life;

    const dxc = x - cxm, dyc = y - cym;
    const wave = Math.sin(Math.sqrt(dxc * dxc + dyc * dyc) / 20 - f + partO[i]) * 1.5;
    rX[i] = x + sx * DISPLACE;
    rY[i] = y + sy * DISPLACE + wave;

    // letters drifting behind the answer fade so it stays legible
    if (answer && answer.box && !inForm[i]) {
      const b = answer.box;
      if (x > b.cx - b.w / 2 - 30 && x < b.cx + b.w / 2 + 30 && y > b.y - 30 && y < b.y + b.h + 80) a *= 1 - 0.85 * answer.level;
    }

    // overlap: the first letter in a cell stays bright, others dim until they drift apart
    if (!inForm[i]) {
      const k = occAt(rX[i], rY[i]);
      let crowdTarget = 1;
      if (k >= 0) { if (occ[k]) crowdTarget = 0.08; else occ[k] = 1; }
      partCrowd[i] += (crowdTarget - partCrowd[i]) * 0.2;
      a *= partCrowd[i];
    }

    const crest = constrain((sx + sy) * CREST_K, -0.3, 0.6);
    partS[i] = 1 + max(crest, 0) * 0.7;
    a *= constrain(0.55 + crest, 0.15, 1);
    partA[i] = a;
    rB[i] = a < 0.04 ? 255 : min(ALPHA_LEVELS - 1, floor(a * ALPHA_LEVELS));
  }

  aliveLetters = alive;
  pullForm(handForm, handForm ? handForm.level : 0);
  pullForm(answerForm, answer ? answer.level : 0);

  // draw the free letters in a few alpha batches
  const ctx = drawingContext;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  for (let b = 0; b < ALPHA_LEVELS; b++) {
    ctx.globalAlpha = (b + 0.7) / ALPHA_LEVELS;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      if (rB[i] === b) glyph(ctx, partC[i], rX[i], rY[i], GLYPH_PX * partS[i]);
    }
  }
  drawForm(ctx, handForm);
  drawForm(ctx, answerForm);
  ctx.restore();
}

// ---------- Formations: letters leave the current to draw a hand or spell an answer ----------
function makeForm(kind, targets) {
  const n = targets.length;
  return {
    kind, n, level: 0,
    idx: new Int32Array(n), tx: new Float32Array(n), ty: new Float32Array(n),
    ch: new Int16Array(n), px: new Float32Array(n), delay: new Float32Array(n), ph: new Float32Array(n),
    k: new Float32Array(n), cx: 0
  };
}

function pullForm(form, level) {
  if (!form) return;
  const t = frameCount * 0.05;
  for (let j = 0; j < form.n; j++) {
    const i = form.idx[j];
    let k = constrain(level * 1.7 - form.delay[j] * 0.7, 0, 1);
    k = k * k * (3 - 2 * k);
    form.k[j] = k;
    if (k <= 0.001) continue;
    rB[i] = 255;   // drawn by drawForm instead
    let tx = form.tx[j], ty = form.ty[j];
    if (form.kind === "answer") tx = form.cx + (tx - form.cx) * (1 + (1 - k) * 0.6);  // spacing tightens as it settles
    slopeAt(tx, ty);
    tx += constrain(SX * 0.04, -3, 3) + Math.sin(t + form.ph[j]) * 0.8;
    ty += constrain(SY * 0.04, -3, 3) + Math.cos(t * 0.8 + form.ph[j]) * 0.8;
    rX[i] += (tx - rX[i]) * k;
    rY[i] += (ty - rY[i]) * k;
    if (k > 0.98) { partX[i] = rX[i]; partY[i] = rY[i]; }   // when released, it flows on from here
  }
}

function drawForm(ctx, form) {
  if (!form) return;
  for (let j = 0; j < form.n; j++) {
    const k = form.k[j];
    if (k <= 0.001) continue;
    const i = form.idx[j];
    ctx.globalAlpha = partA[i] + (0.95 - partA[i]) * k;
    const ci = form.ch[j] >= 0 && k > 0.5 ? form.ch[j] : partC[i];
    glyph(ctx, ci, rX[i], rY[i], GLYPH_PX + (form.px[j] - GLYPH_PX) * k);
  }
}

// Give letters back to the current; they fade out over the next second.
function releaseForm(form) {
  for (let j = 0; j < form.n; j++) {
    const i = form.idx[j];
    inForm[i] = 0;
    if (form.kind === "answer") partAge[i] = max(partAge[i], partLife[i] - 60);
  }
}

// The answer: for each letter, find the nearest matching letter already in the water.
function buildAnswerForm(a, px, py) {
  const text = a.text.toUpperCase();
  const words = text.split(" ");
  const space = ANSWER_PX * 0.45;
  const advOf = ch => (charIndex[ch] !== undefined ? atlasAdv[charIndex[ch]] : 0.6) * ANSWER_PX + ANSWER_TRACK;
  const maxW = width * ANSWER_MAX_W;

  // wrap into lines
  const lines = [[]];
  let lineW = 0;
  for (const w of words) {
    const ww = [...w].reduce((s, ch) => s + advOf(ch), 0);
    if (lineW > 0 && lineW + space + ww > maxW) { lines.push([]); lineW = 0; }
    lines[lines.length - 1].push(w);
    lineW += (lineW > 0 ? space : 0) + ww;
  }
  const lineH = ANSWER_PX * 1.35;
  const widths = lines.map(l => l.reduce((s, w, k) => s + (k ? space : 0) + [...w].reduce((t, ch) => t + advOf(ch), 0), 0));
  const blockW = max(...widths), blockH = lines.length * lineH;
  const cx = constrain(px, blockW / 2 + 40, width - blockW / 2 - 40);
  const top = constrain(py - blockH / 2, 40, height - blockH - 110);

  const targets = [];
  lines.forEach((l, li) => {
    let x = cx - widths[li] / 2;
    const y = top + li * lineH + lineH / 2;
    l.forEach((w, k) => {
      if (k) x += space;
      for (const ch of w) {
        const adv = advOf(ch);
        if (charIndex[ch] !== undefined) targets.push({ ch, x: x + adv / 2 - ANSWER_TRACK / 2, y });
        x += adv;
      }
    });
  });

  const form = makeForm("answer", targets);
  form.cx = cx;
  targets.forEach((tg, j) => {
    const want = charIndex[tg.ch.toLowerCase()];
    let best = -1, bestD = Infinity, any = -1, anyD = Infinity;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      if (inForm[i] || partAge[i] >= partLife[i] - 30) continue;
      const dx = partX[i] - tg.x, dy = partY[i] - tg.y;
      const d = dx * dx + dy * dy;
      if (partC[i] === want && d < bestD) { bestD = d; best = i; }
      if (d < anyD) { anyD = d; any = i; }
    }
    const i = best >= 0 && bestD < 700 * 700 ? best : any >= 0 ? any : nextFree();
    inForm[i] = 2;
    form.idx[j] = i;
    form.tx[j] = tg.x; form.ty[j] = tg.y;
    form.ch[j] = charIndex[tg.ch];
    form.px[j] = ANSWER_PX;
    form.delay[j] = j / max(1, targets.length) + random(0.1);
    form.ph[j] = random(TWO_PI);
  });
  a.box = { cx, y: top, w: blockW, h: blockH };
  return form;
}

// ---------- Idle hand drawn by gathering letters ----------
function ghostPoints() {
  const size = height * 0.45;
  const cx = width / 2, cy = height * 0.55;
  return DEFAULT_HAND.map(([x, y]) => ({ x: cx + x * size, y: cy + y * size }));
}

// Filled hand shape: thick rounded strokes for fingers, palm and wrist.
function paintHand(ctx, pts, sc) {
  const palmLen = dist(pts[0].x, pts[0].y, pts[9].x, pts[9].y);
  const fw = palmLen * 0.24;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  for (let f = 0; f < FINGERS.length; f++) {
    ctx.lineWidth = fw * FINGER_W[f] * sc;
    ctx.beginPath();
    FINGERS[f].forEach((p, j) => (j ? ctx.lineTo : ctx.moveTo).call(ctx, pts[p].x * sc, pts[p].y * sc));
    ctx.stroke();
  }
  ctx.lineWidth = fw * sc;
  ctx.beginPath();
  PALM.forEach((p, j) => (j ? ctx.lineTo : ctx.moveTo).call(ctx, pts[p].x * sc, pts[p].y * sc));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const palmW = dist(pts[5].x, pts[5].y, pts[17].x, pts[17].y);
  ctx.lineWidth = palmW * 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(pts[0].x * sc, pts[0].y * sc);
  ctx.lineTo((pts[0].x - (pts[9].x - pts[0].x) * 0.45) * sc, (pts[0].y - (pts[9].y - pts[0].y) * 0.45) * sc);
  ctx.stroke();
}

function buildHandForm() {
  const pts = ghostPoints();
  const sc = 1 / 3;
  maskCanvas.width = ceil(width * sc);
  maskCanvas.height = ceil(height * sc);
  const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  paintHand(mctx, pts, sc);
  const data = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;

  // letter grid inside the hand, in reading order, written with the oracle's own lines
  const stepX = GLYPH_PX * 0.68, stepY = HAND_STEP * 1.25;
  const text = LINE_TOKENS.map(t => t.join(" ")).join("   ");
  let ti = floor(random(text.length));
  let targets = [];
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const mx = floor(x * sc), my = floor(y * sc);
      if (data[(my * maskCanvas.width + mx) * 4 + 3] <= 128) continue;
      const ch = text[ti++ % text.length];
      if (ch !== " " && charIndex[ch] !== undefined) targets.push({ x, y, ci: charIndex[ch] });
    }
  }
  if (targets.length > HAND_MAX_PTS) targets = targets.slice(0, HAND_MAX_PTS);

  const pool = [];
  for (let i = 0; i < NUM_PARTICLES; i++) if (!inForm[i]) pool.push(i);
  shuffle(pool, true);
  const n = min(targets.length, pool.length);
  const form = makeForm("hand", targets.slice(0, n));
  for (let j = 0; j < n; j++) {
    const i = pool[j];
    inForm[i] = 1;
    if (partAge[i] >= partLife[i]) { partX[i] = random(width); partY[i] = random(height); }
    partC[i] = targets[j].ci;
    partAge[i] = 30;
    partLife[i] = 30 + random(120, 360);      // after release it drifts this long, then fades
    form.idx[j] = i;
    form.tx[j] = targets[j].x;
    form.ty[j] = targets[j].y;
    form.ch[j] = -1;                 // keep its own letter
    form.px[j] = GLYPH_PX * 1.05;
    form.delay[j] = random(0.6);
    form.ph[j] = random(TWO_PI);
  }
  form.tip = pts[8];
  return form;
}

function updateHandForm() {
  const target = constrain((idleA - 0.2) / 0.8, 0, 1);
  if (!handForm && idleA > 0.5 && !hand.present) handForm = buildHandForm();
  if (!handForm) return;
  handForm.level = target;
  if (frameCount % 120 === 0 && target > 0.8) drop(handForm.tip.x, handForm.tip.y, 14, 150);
  if (hand.present && target <= 0.001) {
    releaseForm(handForm);
    handForm = null;
  }
}

// ---------- Prompts ----------
function capsText(str, x, y, px, alpha, track) {
  const ctx = drawingContext;
  ctx.save();
  ctx.font = `500 ${px}px ${GLYPH_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${track}px`;
  ctx.fillStyle = `rgba(240,242,255,${alpha.toFixed(3)})`;
  ctx.fillText(str.toUpperCase(), x, y);
  ctx.restore();
}

function drawPrompts(now) {
  if (idleA > 0.02) {
    const period = 4500;
    const phase = now % (period * 2);
    const which = phase < period ? 0 : 1;
    const f = sin(PI * ((phase % period) / period));
    capsText(IDLE_LINES[which], width / 2, height * 0.1, 15, 0.9 * idleA * f, 6);
  }

  const wantHint = hand.present && session && !session.closed && session.pinches === 0 && now - session.start > 2500;
  hintA = lerp(hintA, wantHint ? 1 : 0, 0.05);
  if (hintA > 0.01 && hand.present) capsText(PINCH_HINT, hand.x, hand.y - 60, 12, 0.85 * hintA, 4);

}

// Fingertip and thumb marks that draw together as you pinch: teaches the gesture
function drawHandMarks() {
  if (!hand.present) return;
  const c = constrain(map(hand.ratio, PINCH_OFF + 0.4, PINCH_ON, 0, 1), 0, 1);
  noFill();
  strokeWeight(1);
  stroke(200, 225, 255, 70 + 120 * c);
  circle(hand.x, hand.y, 26 - 10 * c);
  if (!mouseMode) {
    circle(hand.tx, hand.ty, 18 - 6 * c);
    stroke(200, 225, 255, 150 * c);
    line(hand.x, hand.y, hand.tx, hand.ty);
  }
  if (pinch.on) {
    noStroke();
    fill(255, 240, 215, 230);
    circle(pinch.x, pinch.y, 6);
  }
}

// ---------- Answer timing + machine data ----------
function updateAnswer(now) {
  if (!answer) return;
  if (answer.state === "rising") {
    answer.level = min(1, (now - answer.t0) / REVEAL_MS);
    if (answer.releasedAt && !hand.present && now - lastHandTime > ANSWER_LEAVE_MS && answer.level >= 1) {
      answer.state = "sinking";
      answer.from = 1;
      answer.t0 = now;
    }
  } else {
    answer.level = answer.from * (1 - (now - answer.t0) / SINK_MS);
    if (answer.level <= 0) {
      answer = null;
      if (answerForm) { releaseForm(answerForm); answerForm = null; }
    }
  }
}

function drawAnswerData() {
  if (!answer || !showMachine || !answer.box) return;
  const L = answer.level;
  const ease = 1 - Math.pow(1 - L, 3);
  const b = answer.box;
  const cx = b.cx;
  const ruleY = b.y + b.h + 6;
  const ctx = drawingContext;
  ctx.save();

  // hairline that draws outward from the center
  const ruleW = b.w * ease;
  ctx.strokeStyle = `rgba(160,195,240,${(0.4 * L).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - ruleW / 2, ruleY);
  ctx.lineTo(cx + ruleW / 2, ruleY);
  ctx.stroke();

  // readings in small tracked capitals
  const r = answer.reading;
  const data = [
    `HESITATION ${r.hesitation.toFixed(1)}S`,
    `UNREST ${r.unrest.toFixed(2)}`,
    `DEPTH ${r.depth.toFixed(2)}`,
    `STIR ${r.stir.toFixed(2)}`,
    `TEMP ${answer.temp.toFixed(2)}`
  ].join("     ");
  ctx.font = `400 10px ${MONO}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = `rgba(150,185,235,${(0.7 * L).toFixed(3)})`;
  ctx.fillText(data, cx, ruleY + 12);

  // confidence as a thin bar
  const barW = 140, bx = cx - barW / 2, by = ruleY + 36;
  ctx.fillStyle = `rgba(150,185,235,${(0.2 * L).toFixed(3)})`;
  ctx.fillRect(bx, by, barW, 1);
  ctx.fillStyle = `rgba(230,240,255,${(0.85 * L).toFixed(3)})`;
  ctx.fillRect(bx, by - 0.5, barW * answer.confidence * ease, 2);
  ctx.fillStyle = `rgba(150,185,235,${(0.7 * L).toFixed(3)})`;
  ctx.fillText(`CONFIDENCE ${answer.confidence.toFixed(2)}`, cx, by + 10);
  ctx.restore();
}

// ---------- Operator controls ----------
function drawDebug() {
  noStroke();
  fill(0, 180);
  rect(8, 8, 420, 136);
  if (video.width) image(video, 12, 12, 160, 120);
  fill(220);
  textAlign(LEFT, TOP);
  textSize(12);
  textFont("monospace");
  const lines = [
    `fps ${frameRate().toFixed(0)}`,
    `mode ${mouseMode ? "mouse" : "camera"}`,
    `hands ${hands.length}`,
    `pinch ${hand.ratio.toFixed(2)}`,
    `pinch ${pinch.on}`,
    `session ${session ? ((millis() - session.start) / 1000).toFixed(0) + "s" : "idle"}`
  ];
  text(lines.join("\n"), 180, 14);
  textFont("sans-serif");
}

function keyPressed() {
  const k = key.toLowerCase();
  if (k === "m") { mouseMode = !mouseMode; hand.present = false; }
  if (k === "d") debug = !debug;
  if (k === "t") showMachine = !showMachine;
  if (k === "f") fullscreen(!fullscreen());
}

function mouseMoved() { lastMouseMove = millis(); }
function mouseDragged() { lastMouseMove = millis(); }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initAll();
  background(0);
}