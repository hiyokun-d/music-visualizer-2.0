const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const thumbnailEl = document.getElementById("thumbnail");

canvas.width = innerWidth;
canvas.height = innerHeight;

let audioContext;
let wholeAnalyzer, bassAnalyzer, drumAnalyzer, otherAnalyzer;
let bassGain, drumGain, otherGain;

const history = [];
const HISTORY_SIZE = 43;
const SENSITIVITY = 1.2;

const beatThreshold = 248;
let beatDetected = {
  bass: false,
  drum: false,
  other: false,
};
let beatTimeout = null;

addEventListener("click", startAudio);

function startAudio() {
  audioContext = new AudioContext();

  // analyzers
  wholeAnalyzer = audioContext.createAnalyser();
  bassAnalyzer = audioContext.createAnalyser();
  drumAnalyzer = audioContext.createAnalyser();
  otherAnalyzer = audioContext.createAnalyser();

  // gain nodes (muted)
  bassGain = audioContext.createGain();
  bassGain.gain.value = 0;

  drumGain = audioContext.createGain();
  drumGain.gain.value = 0;

  otherGain = audioContext.createGain();
  otherGain.gain.value = 0;

  let wholeMusic = "./music/entire_track/test.mp3";
  let diff_tracks = {
    bass: "./music/4_diff_tracks/test_bass.wav",
    drum: "./music/4_diff_tracks/test_drums.wav",
    other: "./music/4_diff_tracks/test_other.wav",
  };

  Promise.all([
    loadTrack(wholeMusic, wholeAnalyzer, null, "whole"),
    loadTrack(diff_tracks.bass, bassAnalyzer, bassGain, "bass"),
    loadTrack(diff_tracks.drum, drumAnalyzer, drumGain, "drum"),
    loadTrack(diff_tracks.other, otherAnalyzer, otherGain, "other"),
  ])
    .then((sources) => {
      const instrumentStart = audioContext.currentTime + 0.1;
      const wholeDelay = 0.45; // delay wholeMusic by 1 second

      sources.forEach(({ name, source }) => {
        if (name === "whole") {
          source.start(instrumentStart + wholeDelay); // delayed
        } else {
          source.start(instrumentStart); // start immediately
        }
      });
      drawVisualizer(otherAnalyzer);
      detectBeat(sources[2], beatDetected, "drum");
      detectBeat(sources[1], beatDetected, "bass");
    })
    .catch((err) => console.error("Load error:", err));
}

function loadTrack(url, analyzer, gainNode = null, name) {
  return fetch(url)
    .then((res) => res.arrayBuffer())
    .then((buf) => audioContext.decodeAudioData(buf))
    .then((decoded) => {
      const source = audioContext.createBufferSource();
      source.buffer = decoded;

      analyzer.fftSize = 1024;
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyzer);

      if (gainNode) {
        analyzer.connect(gainNode);
        gainNode.connect(audioContext.destination);
      } else {
        analyzer.connect(audioContext.destination);
      }

      return { name, source, analyzer, dataArray, bufferLength }; // return source so we can start() later
    });
}

function detectBeat(track, beatObj, key) {
  const { analyzer, dataArray, bufferLength } = track;
  analyzer.getByteFrequencyData(dataArray);

  const sampleRate = 44100;
  const binSize = sampleRate / analyzer.fftSize;

  let energy = 0;
  for (let i = 0; i < bufferLength; i++) {
    const freq = i * binSize;
    if (freq >= 40 && freq <= 120) {
      energy += dataArray[i];
    }
  }

  history.push(energy);
  if (history.length > HISTORY_SIZE) history.shift();

  const avg = history.reduce((a, b) => a + b, 0) / history.length;

  if (energy > avg * SENSITIVITY) {
    beatObj[key] = true;
    clearTimeout(beatTimeout);
    beatTimeout = setTimeout(() => (beatObj[key] = false), 120);
  }

  requestAnimationFrame(() => detectBeat(track, beatObj, key));
}

function drawVisualizer(analyzer) {
  const bufferLength = analyzer.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const barWidth = 15;
  const spacing = 0;

  // Reduced height multiplier (3D but smaller)
  const HEIGHT_MULT = 0.8;

  // Particle Colors
  const COLORS = ["#00F2FF", "#FF2EFF", "#FFD600", "#41FF5E", "#FF5733"];

  let particles = [];

  class Particle {
    constructor(x, baseY) {
      this.x = x;
      this.y = baseY;
      this.speed = Math.random() * 1.2 + 1;
      this.size = Math.random() * 3 + 2;
      this.alpha = 1;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    update() {
      this.y -= this.speed;
      this.alpha -= 0.015;
    }
    draw() {
      ctx.fillStyle =
        this.color +
        Math.floor(this.alpha * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.fillRect(this.x, this.y, this.size, this.size * 2);
    }
  }

  function spawnParticles(centerX, intensity) {
    let count = Math.floor(intensity / 30);
    const baseY = canvas.height;

    for (let i = 0; i < count; i++) {
      particles.push(new Particle(centerX, baseY));
    }
  }

  let smooth = new Array(bufferLength).fill(0);

  function draw() {
    analyzer.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const bottomY = canvas.height;

    let left = centerX;
    let right = centerX;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < bufferLength / 2; i++) {
      const raw = dataArray[i];
      const targetHeight = raw * HEIGHT_MULT;
      gsap.to(smooth, {
        [i]: targetHeight,
        duration: 0.15,
        ease: "power2.out",
      });

      const h = smooth[i];

      // Spawn particles from dead center, NOT from bars

      // Neon color
      ctx.fillStyle = "#00F2FF";

      if (raw > 170) {
        spawnParticles(left, raw);
        spawnParticles(right, raw);
      }

      // Bars (mirrored)
      ctx.fillRect(left - barWidth, bottomY - h, barWidth, h);
      ctx.fillRect(right, bottomY - h, barWidth, h);

      left -= barWidth + spacing;
      right += barWidth + spacing;
    }

    // Draw particles
    // particles.forEach((p, index) => {
    //   p.update();
    //   p.draw();
    //   if (p.alpha <= 0) particles.splice(index, 1);
    // });

    ctx.restore();

    if (beatDetected.drum) {
      onDrumBeat();
    }
    requestAnimationFrame(draw);
  }

  draw();
}

let beatCooldown = false;

function onDrumBeat() {
  if (beatCooldown) return;
  beatCooldown = true;

  const cx = canvas.width / 2;
  const cy = canvas.height - 100;

  // ---- SCREEN FLASH ----
  gsap.fromTo(
    ".screen-flash",
    { opacity: 0 },
    { opacity: 0.3, duration: 0.05, yoyo: true, repeat: 1 },
  );

  // ---- CANVAS ENERGY RING ----
  for (let i = 0; i < 1; i++) {
    const ring = document.createElement("div");
    ring.className = "energy-wave";
    document.body.appendChild(ring);

    gsap.set(ring, {
      left: cx - 50,
      top: cy - 50,
      width: 100,
      height: 100,
      borderRadius: "50%",
      border: "4px solid rgba(0,255,200,0.7)",
      opacity: 1,
      scale: 0.1,
    });

    gsap.to(ring, {
      scale: gsap.utils.random(3, 6),
      opacity: 0,
      duration: 0.5,
      ease: "expo.out",
      onComplete: () => ring.remove(),
    });
  }

  // ---- DOM PARTICLE EXPLOSION ----
  for (let i = 0; i < 35; i++) {
    const p = document.createElement("div");
    p.className = "beat-particle";
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = gsap.utils.random(80, 250);
    const size = gsap.utils.random(4, 14);

    gsap.set(p, {
      position: "absolute",
      left: thumbnailEl.offsetLeft + thumbnailEl.offsetWidth / 2,
      top: thumbnailEl.offsetTop + thumbnailEl.offsetHeight / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: `hsl(${Math.random() * 360}, 90%, 65%)`,
      pointerEvents: "none",
      opacity: 1,
      mixBlendMode: "screen",
    });

    gsap.to(p, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      scale: 0,
      opacity: 0,
      duration: gsap.utils.random(0.4, 1.1),
      ease: "expo.out",
      onComplete: () => p.remove(),
    });
  }

  // ---- PIXEL RIP CANVAS DISTORTION ----
  const slices = 6;
  const sliceHeight = canvas.height / slices;
  for (let i = 0; i < slices; i++) {
    const y = i * sliceHeight;
    const shift = gsap.utils.random(-30, 30);

    gsap.to(
      {},
      {
        duration: 0.15,
        onUpdate: () => {
          const imageData = ctx.getImageData(0, y, canvas.width, sliceHeight);
          ctx.putImageData(imageData, shift, y);
        },
      },
    );
  }

  // ---- MAIN THUMBNAIL TIMELINE ----
  const tl = gsap.timeline({
    onComplete: () => {
      beatCooldown = false;
    },
  });

  // ⚡ Hyper glitch
  tl.to(thumbnailEl, {
    filter: `
      brightness(300%)
      contrast(260%)
      saturate(220%)
      blur(3px)
      drop-shadow(-10px 0px 8px magenta)
      drop-shadow(10px 0px 8px cyan)
    `,
    rotateX: gsap.utils.random(-45, 45),
    rotateY: gsap.utils.random(-45, 45),
    rotate: gsap.utils.random(-20, 20),
    scale: 1.7,
    duration: 0.13,
    ease: "power4.out",
  });

  // 🌈 Chromatic aberration
  tl.to(thumbnailEl, {
    filter: `
      brightness(180%)
      contrast(150%)
      saturate(200%)
      drop-shadow(-8px 0px 6px #ff00cc)
      drop-shadow(8px 0px 6px #00eaff)
    `,
    scale: 1.05,
    duration: 0.25,
    ease: "expo.out",
  });

  // 🔧 Cleanup
  tl.to(thumbnailEl, {
    scale: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    filter: "brightness(100%) contrast(100%) saturate(100%) blur(0px)",
    duration: 0.3,
    ease: "power2.out",
  });

  // tl.to(thumbnailEl, {
  //   filter: "brightness(130%) contrast(135%) saturate(70%)",
  //   scale: 1.2,
  //   duration: 0.3,
  //   yoyo: true,
  //   delay: 0,
  //   onComplete: () => {
  //     tl.to(thumbnailEl, {
  //       filter: "brightness(100%) contrast(100%)",
  //       scale: 1.05,
  //       duration: 0.5,
  //       delay: 0,
  //     });
  //   },
  // });
}
