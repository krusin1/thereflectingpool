const RES = 4;
const DAMPING = 0.985;
const WATER_ALPHA = 0.8;

const NUM_PARTICLES = 3500;
const LETTERS_IDLE = 80;
const LETTERS_ACTIVE = 1800;
const NUM_DOTS = 7000;
const GLYPH_PX = 12;
const LIFE_MIN = 300;
const LIFE_MAX = 600;
const FLOW_CELL = 40;
const NOISE_SCALE = 0.005;
const RIDE = 0.008;
const DISPLACE = 0.06;
const CREST_K = 0.0025;

const FIELD_STOPS = [
  [0.00, [3, 5, 24]],
  [0.30, [18, 32, 140]],
  [0.50, [55, 80, 235]],
  [0.65, [125, 90, 230]],
  [0.80, [240, 105, 140]],
  [1.00, [255, 195, 160]]
];
const FIELD_BASE = 0.42;
const HEAT_DECAY = 0.985;

const ANSWER_PX = 34;
const ANSWER_TRACK = 8;
const ANSWER_MAX_W = 0.8;

const HAND_STEP = 9;
const HAND_MAX_PTS = 1100;

const PINCH_ON = 0.35;
const PINCH_OFF = 0.6;
const RELEASE_MS = 200;
const ANSWER_LEAVE_MS = 3000;

const DRAG_R = 170;
const DRAG_K = 0.25;
const PART_K = 0.15;
const MOMENTUM = 0.92;
const MAX_DRIFT = 8;
const HOLD_LOST_MS = 900;
const SMOOTH = 0.45;
const HAND_GRACE_MS = 300;
const IDLE_DELAY_MS = 6000;
const READ_MS = 1100;
const REVEAL_MS = 1800;
const SINK_MS = 2200;

const GLYPH_FONT = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", Menlo, monospace';

const IDLE_LINES = ["Hold a question in your mind", "Then reach over the water"];
const PINCH_HINT = "Pinch to look beneath";

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

let video, handPose;
let hands = [];

let cols, rows, cur, prev, heatF, waterG;
let SX = 0, SY = 0;
let flowCols, flowRows, flowVX, flowVY, fieldN;
let LUT;

let partX, partY, partO, partC, partAge, partLife, partA, partS, inForm, rX, rY, rB;
let spawnCursor = 0, aliveLetters = 0;
let dotX, dotY, dotO, dotR, dotRY, dotB, dotShade;
let partCrowd;
const OCC_W = 8, OCC_H = 14;
let occ, occCols, occRows;
let LINE_TOKENS = [];
const ALPHA_LEVELS = 6;

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

  if (document.fonts) {
    document.fonts.load(`500 ${ATLAS_FONT_PX}px "Space Grotesk"`).then(buildAtlas).catch(() => {});
    document.fonts.load(`10px "IBM Plex Mono"`).catch(() => {});
  }

  initAll();
  buildMarkov(CORPUS);
  startAudio();
  buildOracle();
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
  updateAudio();
  updateHandForm(now);

  drawWater();
  drawDots();
  drawLetters();
  drawPrompts(now);
  drawHandMarks();
  drawReading(now);
  drawAnswerData();

  drawSoundHint();
  if (debug) drawDebug();
}

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
  session.stirQ += hand.speed;
}

function startSession(now) {
  session = { start: now, lastRelease: null, stir: 0, stirQ: 0, pinches: 0, closed: false, recent: [] };
  jitter = [];
}

function updateSession(now) {
  const idle = !hand.present && !answer && now - lastHandTime > IDLE_DELAY_MS;
  if (idle) session = null;
  idleA = lerp(idleA, idle ? 1 : 0, 0.05);
}

function updatePinch(now) {
  if (!hand.present) {
    if (pinch.on) releasePinch(now);
    return;
  }

  const closing = hand.ratio < PINCH_ON;
  const open = hand.ratio > PINCH_OFF;
  if (!open) openSince = now;
  if (!pinch.on && closing) startPinch(now);
  else if (pinch.on && open && now - openSince > RELEASE_MS) releasePinch(now);

  if (pinch.on) {
    setGrabPoint();
  }
}

function setGrabPoint() {
  if (mouseMode) { pinch.x = hand.x; pinch.y = hand.y; }
  else { pinch.x = (hand.x + hand.tx) / 2; pinch.y = (hand.y + hand.ty) / 2; }
}

function startPinch(now) {
  pinch.on = true;
  setGrabPoint();
  drop(pinch.x, pinch.y, 24, 300);
  sfxPinch();
  depositHeat(pinch.x, pinch.y, 140, 0.8);
  if (!session || session.closed) return;

  session.pinches++;
  const r = takeReading(now);
  const o = consult(r, session.recent.slice(-8));
  session.recent.push(o.key);
  session.stirQ = 0;
  answer = {
    text: o.text, reading: r, temp: o.temp, confidence: o.confidence, label: o.label,
    level: 0, from: 0, state: "rising", t0: now + READ_MS, readT0: now
  };
  if (answerForm) releaseForm(answerForm);
  answerForm = buildAnswerForm(answer, pinch.x, pinch.y);
}

function releasePinch(now) {
  pinch.on = false;
  if (session) session.lastRelease = now;
  if (answer) answer.releasedAt = now;
}

function takeReading(now) {
  const since = session.lastRelease !== null ? session.lastRelease : session.start;
  const meanJ = jitter.length ? jitter.reduce((a, b) => a + b, 0) / jitter.length : 0;
  return {
    hesitation: (now - since) / 1000,
    unrest: constrain(meanJ / 8, 0, 1),
    depth: constrain((pinch.on ? pinch.y : hand.y) / height, 0, 1),
    drift: constrain((pinch.on ? pinch.x : hand.x) / width, 0, 1),
    stir: constrain(session.stirQ / (width * 1.5), 0, 1)
  };
}

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

const ORACLE = [
  ["Wait for dusk", "H+"], ["Now is not the time", "H+"], ["Rest. It is coming", "H+ U+"],
  ["You will know soon", "H+"], ["Patience is the deeper water", "H+ D+"], ["Wait. Then wait again", "H+"],
  ["The answer is in the waiting", "H+"], ["Not yet. The water is still moving", "H+ S+"],
  ["Ask again when the surface is still", "H+ U+ D-"], ["You asked too late", "H+ S+"],
  ["You will know it when it stills", "H+ U+"], ["The truth will reveal itself", "H+ U-"],
  ["It unfolds regardless", "H+ S+"],

  ["Choose with certainty", "H-"], ["You already know", "H- U-"], ["Think less", "H- U+"],
  ["You've already begun", "H- S+"], ["You are already in motion", "H- S+"], ["Begin again", "H- S+"],
  ["This is your sign", "H-"], ["Your hands already decided", "H- U-"], ["The answer is yes", "H-"],
  ["Yes, but not the way you think", "H- D+"], ["Trust what returns", "H- D-"],
  ["Go where the current is quiet", "H- U+"], ["Turn back once, then never again", "H- S+"],
  ["Listen to no one", "H- U-"], ["Don't listen to your mind", "H- U+"],

  ["Let go", "U+"], ["Let the water settle first", "U+ H+"], ["Hold still and see", "U+"],
  ["Stillness is a direction", "U+ S-"], ["Drift gently", "U+ S-"], ["What you fear is only a reflection", "U+ D-"],
  ["Speak less and the answer grows", "U+"], ["Be careful. Words echo", "U+ D-"],
  ["The question is heavier than the answer", "U+ D+"],

  ["You are seen", "U-"], ["You will be seen", "U- H+"], ["Look again", "U- D-"], ["All signs point inward", "U- D+"],
  ["Look past your own reflection", "U- D-"], ["What you seek is seeking you", "U- H+"],
  ["It is closer than it looks", "U- D-"], ["The sign is in your hands", "U- H-"],
  ["You were never alone in this", "U-"], ["The current knows your name", "U- S+"],

  ["Something waits beneath", "D+"], ["What sinks is not lost", "D+"], ["The surface lies. The depth does not", "D+"],
  ["The path is under the water", "D+"], ["Let it sink", "D+ U+"], ["You will not like what rises", "D+ H+"],
  ["Something is changing beneath you", "D+ S+"], ["The water remembers what you forgot", "D+"],
  ["Still waters lie", "D+ S-"],

  ["It circles back", "D- S+"], ["Every ripple returns to the shore", "D- S+"], ["You've been here before", "D-"],
  ["It has already happened", "D- H-"], ["Ripple becomes wave", "D- S+"], ["You are asking the wrong shore", "D- H-"],
  ["What moves stays", "D- S-"],

  ["The current has passed you by", "S+ H+"], ["The tide turns without you", "S+"],
  ["Everything you lost is downstream", "S+ D+"], ["The path is dissolving", "S+"], ["A door has closed", "S+ H+"],
  ["One path splits", "S+ H-"], ["Currents are changing", "S+"], ["Change arrives unseen", "S+ D+"],
  ["The answer is already moving", "S+ H-"], ["The answer drifts toward you", "S- H+"],
  ["What you seek has already passed through you", "S+ U-"],

  ["It is not known", ""], ["It was never about the question", ""], ["Someone is already deciding", "H+"],
  ["The answer is no", "H+"], ["No, and that is a mercy", "H+ U+"]
];

const ALLOW_REMIX = false;
const REMIX_PENALTY = 0.25;
const AXES = ["H", "U", "D", "S"];
const TRAIT_WORDS = { "H+": "HESITANT", "H-": "CERTAIN", "U+": "RESTLESS", "U-": "STILL",
  "D+": "DEEP", "D-": "SURFACE", "S+": "STIRRED", "S-": "CALM" };

let oracleLines = [], trigrams = {};

function tagVector(tags) {
  const v = [0, 0, 0, 0];
  for (const t of tags.split(" ").filter(Boolean)) v[AXES.indexOf(t[0])] += t[1] === "+" ? 1 : -1;
  return v;
}

function buildOracle() {
  oracleLines = ORACLE.map(([text, tags]) => ({ text, words: tokenize(text), vec: tagVector(tags) }));
  trigrams = {};
  oracleLines.forEach((l, li) => {
    const w = ["^", "^", ...l.words, "$"];
    for (let i = 2; i < w.length; i++) {
      const key = w[i - 2] + " " + w[i - 1];
      (trigrams[key] = trigrams[key] || []).push({ next: w[i], line: li });
    }
  });
}

function remix(rng) {
  const words = [], used = [];
  let a = "^", b = "^";
  for (let n = 0; n < 12; n++) {
    const opts = trigrams[a + " " + b];
    if (!opts) return null;
    const pick = opts[floor(rng() * opts.length)];
    used.push(pick.line);
    if (pick.next === "$") break;
    words.push(pick.next);
    a = b; b = pick.next;
  }
  if (words.length < 3 || words.length > 9) return null;
  const vec = [0, 0, 0, 0];
  for (const li of used) for (let k = 0; k < 4; k++) vec[k] += oracleLines[li].vec[k] / used.length;
  return { words, vec, remix: new Set(used).size > 1 };
}

function profileOf(r) {
  return [
    constrain(map(r.hesitation, 1, 5, -1, 1), -1, 1),
    constrain(map(r.unrest, 0.15, 0.6, -1, 1), -1, 1),
    constrain(map(r.depth, 0.2, 0.8, -1, 1), -1, 1),
    constrain(map(r.stir, 0, 1, -1, 1), -1, 1)
  ];
}

function cosine(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let k = 0; k < 4; k++) { d += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

function readingLabel(p) {
  const parts = p.map((v, k) => ({ v, k })).filter(o => Math.abs(o.v) > 0.3)
    .sort((x, y) => Math.abs(y.v) - Math.abs(x.v)).slice(0, 3)
    .map(o => TRAIT_WORDS[AXES[o.k] + (o.v > 0 ? "+" : "-")]);
  return parts.length ? parts.join(" · ") : "UNCLEAR";
}

function consult(r, recent) {
  const rng = mulberry32(hashReading(r));
  const p = profileOf(r);
  const seen = new Set(recent || []);
  const cands = new Map();
  for (const l of oracleLines) cands.set(l.words.join(" "), { words: l.words, vec: l.vec, remix: false, text: l.text });
  if (ALLOW_REMIX) {
    for (let i = 0; i < 80; i++) {
      const c = remix(rng);
      if (c && c.remix && !cands.has(c.words.join(" "))) cands.set(c.words.join(" "), c);
    }
  }

  const list = [];
  for (const [key, c] of cands) {
    if (seen.has(key)) continue;
    const fit = cosine(p, c.vec);
    const strength = Math.min(1, Math.hypot(...c.vec) / 1.5);
    list.push({ key, c, fit, score: fit * (0.6 + 0.4 * strength) - (c.remix ? REMIX_PENALTY : 0) });
  }
  const temp = 0.08 + 0.18 * constrain(r.unrest, 0, 1);
  const mx = Math.max(...list.map(o => o.score));
  let total = 0;
  for (const o of list) { o.w = Math.exp((o.score - mx) / temp); total += o.w; }
  let x = rng() * total, chosen = list[list.length - 1];
  for (const o of list) { x -= o.w; if (x <= 0) { chosen = o; break; } }

  let text = chosen.c.text || chosen.c.words.join(" ");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return {
    text, key: chosen.key, temp,
    confidence: constrain(0.5 + 0.5 * chosen.fit, 0, 1),
    label: readingLabel(p), remix: chosen.c.remix
  };
}

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
  const confidence = Math.exp(logSum / probs.length);
  let text = words.join(" ");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { text, confidence };
}

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
    const s = min(hand.speed * 3, 100) + 12 * sin(frameCount * 0.3);
    drop(hand.x, hand.y, 12, s);

    depositHeat(hand.x, hand.y, 70, 0.03 + min(hand.speed, 40) * 0.012);
  }
  if (idleA > 0.5 && random() < 0.03) {
    const rx = random(width), ry = random(height);
    drop(rx, ry, 8, 80);
    if (random() < 0.35) sfxDrop(0.05);
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
      fieldN[i] = constrain((n - 0.3) / 0.4, 0, 1);
      dotShade[i] = noise(px * 0.01, py * 0.01);
    }
  }
}

function buildAtlas() {
  const set = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ'.,");
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
    if (!inForm[i] && partAge[i] >= partLife[i]) return i;
  }
  return -1;
}

function occAt(x, y) {
  const cx = floor(x / OCC_W), cy = floor(y / OCC_H);
  if (cx < 0 || cy < 0 || cx >= occCols || cy >= occRows) return -1;
  return cy * occCols + cx;
}

function spawnPhrase(randomAge) {
  const words = LINE_TOKENS[floor(random(LINE_TOKENS.length))];
  const start = floor(random(words.length));
  const phrase = words.slice(start, start + 1 + floor(random(3))).join(" ");
  const life = random(LIFE_MIN, LIFE_MAX);
  const age = randomAge ? random(life) : 0;

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

    if (answer && answer.box && !inForm[i]) {
      const b = answer.box;
      if (x > b.cx - b.w / 2 - 30 && x < b.cx + b.w / 2 + 30 && y > b.y - 30 && y < b.y + b.h + 80) a *= 1 - 0.85 * answer.level;
    }

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
    rB[i] = 255;
    let tx = form.tx[j], ty = form.ty[j];
    if (form.kind === "answer") tx = form.cx + (tx - form.cx) * (1 + (1 - k) * 0.6);
    slopeAt(tx, ty);
    tx += constrain(SX * 0.04, -3, 3) + Math.sin(t + form.ph[j]) * 0.8;
    ty += constrain(SY * 0.04, -3, 3) + Math.cos(t * 0.8 + form.ph[j]) * 0.8;
    rX[i] += (tx - rX[i]) * k;
    rY[i] += (ty - rY[i]) * k;
    if (k > 0.98) { partX[i] = rX[i]; partY[i] = rY[i]; }
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

function releaseForm(form) {
  for (let j = 0; j < form.n; j++) {
    const i = form.idx[j];
    inForm[i] = 0;
    if (form.kind === "answer") partAge[i] = max(partAge[i], partLife[i] - 60);
  }
}

function buildAnswerForm(a, px, py) {
  const text = a.text.toUpperCase();
  const words = text.split(" ");
  const space = ANSWER_PX * 0.45;
  const advOf = ch => (charIndex[ch] !== undefined ? atlasAdv[charIndex[ch]] : 0.6) * ANSWER_PX + ANSWER_TRACK;
  const maxW = width * ANSWER_MAX_W;

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

function ghostPoints() {
  const size = height * 0.45;
  const cx = width / 2, cy = height * 0.55;
  return DEFAULT_HAND.map(([x, y]) => ({ x: cx + x * size, y: cy + y * size }));
}

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
    partLife[i] = 30 + random(120, 360);
    form.idx[j] = i;
    form.tx[j] = targets[j].x;
    form.ty[j] = targets[j].y;
    form.ch[j] = -1;
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
  if (frameCount % 120 === 0 && target > 0.8) {
    drop(handForm.tip.x, handForm.tip.y, 14, 150);
    sfxDrop(0.07);
  }
  if (hand.present && target <= 0.001) {
    releaseForm(handForm);
    handForm = null;
  }
}

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

function drawReading(now) {
  if (!answer || !answer.box || answer.state !== "rising") return;
  const t = now - answer.readT0;
  const fadeOut = 1 - constrain((now - answer.t0) / 500, 0, 1);
  if (fadeOut <= 0) return;
  const traits = answer.label.split(" · ");
  const step = READ_MS / (traits.length + 1);
  const ctx = drawingContext;
  ctx.save();
  ctx.font = `500 15px ${MONO}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  ctx.shadowColor = "rgba(0,2,14,0.95)";
  ctx.shadowBlur = 10;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const y = answer.box.y + answer.box.h / 2;

  const dots = ".".repeat(1 + (floor(t / 180) % 3));
  const parts = ["READING" + dots.padEnd(3, " ")];
  traits.forEach(tr => parts.push(tr));
  const sep = "   ";
  const full = parts.join(sep);
  let x = answer.box.cx - ctx.measureText(full).width / 2;
  parts.forEach((txt, i) => {
    const a = i === 0 ? 1 : constrain((t - i * step) / 200, 0, 1);
    if (i > 0 && t >= i * step && (answer.traitsPlayed || 0) < i) { answer.traitsPlayed = i; sfxTrait(i - 1); }
    ctx.fillStyle = i === 0 ? `rgba(200,220,255,${(0.95 * fadeOut).toFixed(3)})`
                            : `rgba(255,214,120,${(a * fadeOut).toFixed(3)})`;
    ctx.fillText(txt, x, y + (1 - a) * 6);
    x += ctx.measureText(txt + sep).width;
  });
  ctx.restore();
}

function updateAnswer(now) {
  if (!answer) return;
  if (answer.state === "rising") {
    answer.level = constrain((now - answer.t0) / REVEAL_MS, 0, 1);
    if (!answer.bellPlayed && answer.level > 0.55) { answer.bellPlayed = true; sfxBell(answer.confidence); }
    if (answer.releasedAt && !hand.present && now - lastHandTime > ANSWER_LEAVE_MS && answer.level >= 1) {
      answer.state = "sinking";
      sfxSink();
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

  const ruleW = b.w * ease;
  ctx.strokeStyle = `rgba(160,195,240,${(0.4 * L).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - ruleW / 2, ruleY);
  ctx.lineTo(cx + ruleW / 2, ruleY);
  ctx.stroke();

  const r = answer.reading;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
  ctx.font = `400 12px ${MONO}`;
  ctx.fillStyle = `rgba(200,220,255,${(0.85 * L).toFixed(3)})`;
  ctx.fillText(`READ AS  ${answer.label}`, cx, ruleY + 12);

  const data = [
    `HESITATION ${r.hesitation.toFixed(1)}S`,
    `UNREST ${r.unrest.toFixed(2)}`,
    `DEPTH ${r.depth.toFixed(2)}`,
    `STIR ${r.stir.toFixed(2)}`
  ].join("     ");
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.font = `400 10px ${MONO}`;
  ctx.fillStyle = `rgba(150,185,235,${(0.55 * L).toFixed(3)})`;
  ctx.fillText(data, cx, ruleY + 32);

  const barW = 140, bx = cx - barW / 2, by = ruleY + 56;
  ctx.fillStyle = `rgba(150,185,235,${(0.2 * L).toFixed(3)})`;
  ctx.fillRect(bx, by, barW, 1);
  ctx.fillStyle = `rgba(230,240,255,${(0.85 * L).toFixed(3)})`;
  ctx.fillRect(bx, by - 0.5, barW * answer.confidence * ease, 2);
  ctx.fillStyle = `rgba(150,185,235,${(0.7 * L).toFixed(3)})`;
  ctx.fillText(`MATCH ${round(answer.confidence * 100)}%`, cx, by + 10);
  ctx.restore();
}

const SOUND_VOLUME = 0.2;
const NOISE_VOLUME = 0.5;
const SWISH_VOLUME = 1.2;
const NOISE_BRIGHTNESS = 1100;
let actx = null, master, ambGain, swishGain, swishFilter, padGain, muted = false;

function startAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  const comp = actx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  comp.connect(actx.destination);
  master = actx.createGain();
  master.gain.value = SOUND_VOLUME;
  master.connect(comp);

  const len = actx.sampleRate * 4;
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  const fade = 2000;
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
  }
  const src = actx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = fade / actx.sampleRate;

  const ambF = actx.createBiquadFilter();
  ambF.type = "lowpass";
  ambF.frequency.value = NOISE_BRIGHTNESS;
  ambGain = actx.createGain();
  ambGain.gain.value = NOISE_VOLUME;
  src.connect(ambF).connect(ambGain).connect(master);

  swishFilter = actx.createBiquadFilter();
  swishFilter.type = "bandpass";
  swishFilter.frequency.value = 700;
  swishFilter.Q.value = 0.9;
  swishGain = actx.createGain();
  swishGain.gain.value = 0;
  src.connect(swishFilter).connect(swishGain).connect(master);
  src.start();

  const padF = actx.createBiquadFilter();
  padF.type = "lowpass";
  padF.frequency.value = 1800;
  padGain = actx.createGain();
  padGain.gain.value = 0;
  padF.connect(padGain).connect(master);
  for (const [f, v] of [[220, 0.14], [329.6, 0.1], [440.4, 0.07], [659.3, 0.04]]) {
    const o = actx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const lfo = actx.createOscillator();
    const lg = actx.createGain();
    lfo.frequency.value = 0.07 + Math.random() * 0.08;
    lg.gain.value = f * 0.004;
    lfo.connect(lg).connect(o.frequency);
    const g = actx.createGain();
    g.gain.value = v;
    o.connect(g).connect(padF);
    o.start();
    lfo.start();
  }
}

function audioOn() {
  return actx && actx.state === "running" && !muted;
}

function updateAudio() {
  if (!actx) return;
  const t = actx.currentTime;
  master.gain.setTargetAtTime(muted ? 0 : SOUND_VOLUME, t, 0.2);
  const sp = hand.present ? min(hand.speed / 25, 1) : 0;
  swishGain.gain.setTargetAtTime(sp * SWISH_VOLUME, t, 0.08);
  swishFilter.frequency.setTargetAtTime(700 + sp * 2200, t, 0.12);
  ambGain.gain.setTargetAtTime(NOISE_VOLUME * (hand.present ? 1.4 : 1), t, 0.6);
  const pad = answer && answer.level > 0 ? 0.5 + 0.4 * answer.level : hand.present ? 0.25 : 0.15;
  padGain.gain.setTargetAtTime(pad, t, 0.5);
}

function tone(freq, dur, vol, type, when, glideTo) {
  if (!audioOn()) return;
  const t = actx.currentTime + (when || 0);
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function sfxDrop(vol) {
  const f = 900 + Math.random() * 900;
  tone(f, 0.18, vol * 3, "sine", 0, f * 0.45);
}

function sfxPinch() {
  tone(620, 0.35, 0.35, "sine", 0, 310);
  tone(330, 1.4, 0.15, "sine");
}

function sfxTrait(i) {
  const f = [587.3, 659.3, 784][i % 3];
  tone(f, 0.6, 0.2, "sine");
  tone(f * 2, 0.3, 0.07, "sine");
}

function sfxBell(match) {
  const f = 392 + 196 * constrain(match, 0, 1);
  tone(f, 3.2, 0.4, "sine");
  tone(f * 2.01, 2.2, 0.15, "sine");
  tone(f * 3.02, 1.4, 0.07, "sine");
  tone(f * 0.5, 3.8, 0.12, "sine");
}

function sfxSink() {
  tone(440, 1.6, 0.15, "sine", 0, 220);
}

function mousePressed() { startAudio(); }
function touchStarted() { startAudio(); }
for (const ev of ["pointerdown", "keydown", "touchstart", "click"]) {
  window.addEventListener(ev, startAudio, { capture: true });
}

function drawSoundHint() {
  if (actx && actx.state === "running") return;
  const ctx = drawingContext;
  ctx.save();
  ctx.font = `400 11px ${MONO}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(170,200,255,0.55)";
  ctx.fillText("CLICK OR PRESS ANY KEY FOR SOUND", width - 20, height - 16);
  ctx.restore();
}

function drawDebug() {
  noStroke();
  fill(0, 180);
  rect(8, 8, 520, 150);
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
    `session ${session ? ((millis() - session.start) / 1000).toFixed(0) + "s" : "idle"}`,
    `sound ${actx ? (muted ? "muted" : actx.state) : "off"}`,
    `reads ${session && hand.present ? readingLabel(profileOf(takeReading(millis()))) : "-"}`
  ];
  text(lines.join("\n"), 180, 14);
  textFont("sans-serif");
}

function keyPressed() {
  startAudio();
  const k = key.toLowerCase();
  if (k === "s") muted = !muted;
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