'use strict';

const $ = selector => document.querySelector(selector);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = motionPreference.matches;
let entranceState = 'closed';
let openingTimer;
let fadeTimer;
let audio;
let musicRequested = false;
const entrance = $('#entrance');
const openingVideo = $('#opening-video');
const openingLabel = $('#open-invitation').innerHTML;
const sceneVideos = [...document.querySelectorAll('.scene-video')];
const scenes = [...document.querySelectorAll('[data-scene]')];
const petalHost = $('#petals');
const visibleScenes = new Set();

// The invitation remains readable if JavaScript is unavailable.
entrance.hidden = false;
document.body.classList.add('at-entrance');
$('#motion-toggle').hidden = false;
$('#replay-entrance').hidden = false;
new ResizeObserver(entries => {
  const height = entries[0].target.getBoundingClientRect().height;
  if (height) document.documentElement.style.setProperty('--header-height', `${height}px`);
}).observe($('.site-header'));

function finishOpening() {
  if (entranceState === 'finished' || entranceState === 'finishing') return;
  clearTimeout(openingTimer);
  entranceState = 'finishing';
  entrance.classList.add('fading-out');
  fadeTimer = setTimeout(() => {
    openingVideo.pause();
    entrance.hidden = true;
    entranceState = 'finished';
    document.body.classList.remove('at-entrance');
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#invitation').focus({ preventScroll: true });
    releasePetals(40);
  }, motionPaused ? 0 : 450);
}

function openInvitation() {
  if (entranceState !== 'closed') return;
  entranceState = 'loading';
  $('#open-invitation').disabled = true;
  $('#open-invitation').textContent = 'Opening…';
  $('#opening-status').textContent = 'Opening your invitation…';
  if (audio) playMusic();
  if (motionPaused) return finishOpening();
  // A slow or blocked video must never lock guests out of the invitation.
  openingTimer = setTimeout(finishOpening, 10000);
  openingVideo.currentTime = 0;
  openingVideo.play().catch(finishOpening);
}

openingVideo.addEventListener('playing', () => {
  if (!['loading', 'playing'].includes(entranceState)) return openingVideo.pause();
  entranceState = 'playing';
  entrance.classList.add('opening');
  openingVideo.classList.add('is-playing');
});
openingVideo.addEventListener('ended', finishOpening);
openingVideo.addEventListener('error', () => {
  if (['loading', 'playing'].includes(entranceState)) finishOpening();
});
$('#open-invitation').addEventListener('click', openInvitation);
for (const link of document.querySelectorAll('.opening-skip, .skip')) {
  link.addEventListener('click', event => {
    if (entranceState !== 'finished') {
      event.preventDefault();
      finishOpening();
    }
  });
}
$('#replay-entrance').addEventListener('click', () => {
  clearTimeout(openingTimer);
  clearTimeout(fadeTimer);
  openingVideo.pause();
  openingVideo.currentTime = 0;
  openingVideo.classList.remove('is-playing');
  entranceState = 'closed';
  entrance.classList.remove('opening', 'fading-out');
  entrance.hidden = false;
  document.body.classList.add('at-entrance');
  sceneVideos.forEach(video => video.pause());
  petalHost.replaceChildren();
  $('#open-invitation').disabled = false;
  $('#open-invitation').innerHTML = openingLabel;
  $('#opening-status').textContent = '';
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('#open-invitation').focus({ preventScroll: true });
});

function updateSceneVideo(video) {
  const mayPlay = !motionPaused && !document.hidden && entranceState === 'finished' && visibleScenes.has(video.closest('[data-scene]'));
  if (!mayPlay) return video.pause();
  if (video.ended || video.dataset.failed) return;
  if (!video.getAttribute('src')) video.src = video.dataset.src;
  video.play().catch(() => { /* The illustrated still is already visible. */ });
}
sceneVideos.forEach(video => {
  video.addEventListener('playing', () => video.classList.add('is-playing'));
  video.addEventListener('error', () => {
    video.dataset.failed = 'true';
    video.classList.remove('is-playing');
  });
});
function setMotion(paused) {
  motionPaused = paused;
  document.body.classList.toggle('motion-paused', paused);
  const button = $('#motion-toggle');
  button.textContent = paused ? 'Play motion' : 'Pause motion';
  button.setAttribute('aria-pressed', String(paused));
  if (paused && ['loading', 'playing'].includes(entranceState)) finishOpening();
  sceneVideos.forEach(updateSceneVideo);
  if (paused) petalHost.replaceChildren();
  else if (entranceState === 'finished') releasePetals(24);
}
$('#motion-toggle').addEventListener('click', () => setMotion(!motionPaused));
motionPreference.addEventListener('change', event => setMotion(event.matches));
setMotion(motionPaused);

const sceneObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const scene = entry.target;
    scene.classList.toggle('is-in-view', entry.isIntersecting);
    if (entry.isIntersecting) visibleScenes.add(scene);
    else visibleScenes.delete(scene);
    const video = scene.querySelector('video');
    if (video) updateSceneVideo(video);
  }
}, { threshold: .12 });
scenes.forEach(scene => sceneObserver.observe(scene));

function releasePetals(count = 26) {
  if (motionPaused || document.hidden || entranceState !== 'finished') return;
  const slots = Math.max(0, 64 - petalHost.childElementCount);
  for (let i = 0; i < Math.min(count, slots); i++) {
    const petal = document.createElement('i');
    petal.className = 'petal';
    // A fuller shower, with smaller petals through the middle to keep text clear.
    const left = Math.random() * 100;
    const edge = left < 22 || left > 78;
    petal.style.cssText = `left:${left}%;--size:${edge ? 12 + Math.random() * 10 : 7 + Math.random() * 7}px;--delay:${Math.random() * 3}s;--duration:${7 + Math.random() * 4}s;--drift:${Math.random() * 150 - 75}px;--rotation:${180 + Math.random() * 400}deg`;
    petal.addEventListener('animationend', () => petal.remove(), { once: true });
    petalHost.append(petal);
  }
}
setInterval(() => { if (visibleScenes.size) releasePetals(); }, 6000);

// Native, inexpensive motion over the client's existing illustrations.
const lampPositions = {
  blessing: [[16, 32], [7, 44], [84, 32], [93, 44]],
  family: [[6, 36], [2, 58], [94, 36], [98, 58]],
  ceremony: [[7, 28], [10, 55], [91, 90]],
  reception: [[15, 64], [29, 66], [76, 91], [91, 88], [52, 89]]
};
for (const scene of scenes.filter(scene => scene.dataset.scene !== 'hands')) {
  const type = scene.dataset.scene;
  const effects = document.createElement('div');
  effects.className = 'scene-effects';
  effects.setAttribute('aria-hidden', 'true');
  (lampPositions[type] || []).forEach(([left, top], index) => {
    const glow = document.createElement('i');
    glow.className = 'lamp-glow';
    glow.style.cssText = `left:${left}%;top:${top}%;animation-delay:${index * -.7}s`;
    effects.append(glow);
  });
  if (type === 'reception') {
    const ns = 'http://www.w3.org/2000/svg';
    const lights = document.createElementNS(ns, 'svg');
    lights.setAttribute('viewBox', '0 0 400 100');
    lights.setAttribute('preserveAspectRatio', 'none');
    lights.classList.add('fairy-lights');
    const wire = document.createElementNS(ns, 'path');
    wire.setAttribute('d', 'M0 8 Q200 100 400 8 M0 0 Q200 62 400 0');
    lights.append(wire);
    for (let row = 0; row < 2; row++) {
      for (let i = 1; i < 20; i++) {
        const t = i / 20;
        const bulb = document.createElementNS(ns, 'circle');
        bulb.setAttribute('cx', String(400 * t));
        bulb.setAttribute('cy', String(row ? 124 * t * (1 - t) : 8 + 184 * t * (1 - t)));
        bulb.setAttribute('r', '1.6');
        lights.append(bulb);
      }
    }
    effects.append(lights);
  }
  if (['ceremony', 'reception'].includes(type)) {
    const shimmer = document.createElement('i');
    shimmer.className = 'lake-shimmer';
    effects.append(shimmer);
    for (let i = 0; i < 16; i++) {
      const sparkle = document.createElement('i');
      sparkle.className = 'twinkle';
      const left = type === 'reception' ? 56 + (i * 17 % 42) : (i % 2 ? 93 : 7);
      const top = type === 'reception' ? 62 + (i * 7 % 32) : 12 + (i * 11 % 77);
      sparkle.style.cssText = `left:${left}%;top:${top}%;animation-delay:${i * -.31}s`;
      effects.append(sparkle);
    }
  }
  scene.append(effects);
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next]);
    tabs[next].focus();
  });
});
const navigationObserver = new IntersectionObserver(entries => {
  const active = entries.filter(entry => entry.isIntersecting).at(-1);
  if (!active) return;
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === `#${active.target.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
document.querySelectorAll('main > section').forEach(section => navigationObserver.observe(section));

const canvas = $('#scratch');
const context = canvas.getContext('2d', { willReadFrequently: true });
let scratching = false;
let revealed = false;
let lastPoint = null;
let scratchCount = 0;
function paintScratch() {
  if (revealed || !context) return;
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const newWidth = Math.round(width * ratio);
  const newHeight = Math.round(height * ratio);
  if (canvas.width === newWidth && canvas.height === newHeight) return;
  canvas.width = newWidth;
  canvas.height = newHeight;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.globalCompositeOperation = 'source-over';
  const gold = context.createLinearGradient(0, 0, width, height);
  gold.addColorStop(0, '#bd9455');
  gold.addColorStop(.45, '#ebd095');
  gold.addColorStop(1, '#c8a264');
  context.fillStyle = gold;
  context.fillRect(0, 0, width, height);
  for (let i = 0; i < width * height / 18; i++) {
    context.fillStyle = i % 2 ? '#fff1c038' : '#6d491a19';
    context.fillRect(Math.random() * width, Math.random() * height, 1.5, 1);
  }
  context.fillStyle = '#49341e';
  context.font = `${Math.min(21, width / 13)}px Georgia`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Scratch to reveal', width / 2, height / 2);
}
function revealDate() {
  if (revealed) return;
  revealed = true;
  $('.scratch-card').classList.add('revealed');
  $('#scratch-instruction').textContent = 'We can’t wait to celebrate with you.';
  $('#reveal-date').hidden = true;
  $('#date-announcement').textContent = $('#date-value').textContent;
  releasePetals(40);
}
function scratch(event) {
  if (!scratching || revealed) return;
  const box = canvas.getBoundingClientRect();
  const point = { x: event.clientX - box.left, y: event.clientY - box.top };
  context.globalCompositeOperation = 'destination-out';
  context.lineWidth = 34;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(lastPoint?.x ?? point.x, lastPoint?.y ?? point.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  lastPoint = point;
  if (++scratchCount % 8 === 0) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let sampled = 0;
    for (let i = 3; i < pixels.length; i += 64) { sampled++; if (pixels[i] < 128) clear++; }
    if (clear / sampled > .38) revealDate();
  }
}
if (context) {
  canvas.hidden = false;
  $('#reveal-date').hidden = false;
  canvas.addEventListener('pointerdown', event => { scratching = true; lastPoint = null; canvas.setPointerCapture(event.pointerId); scratch(event); });
  canvas.addEventListener('pointermove', scratch);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { scratching = false; lastPoint = null; });
  new ResizeObserver(paintScratch).observe(canvas);
  $('#reveal-date').addEventListener('click', revealDate);
} else {
  $('#scratch-instruction').textContent = 'We can’t wait to celebrate with you.';
}

async function playMusic() {
  if (!audio) return;
  musicRequested = true;
  try {
    await audio.play();
    $('#music-toggle').textContent = 'Pause music';
    $('#music-toggle').setAttribute('aria-pressed', 'true');
  } catch {
    musicRequested = false;
    $('#music-toggle').textContent = 'Play music';
    $('#music-toggle').setAttribute('aria-pressed', 'false');
    $('#music-status').textContent = 'Music could not play. Tap Play music to try again.';
  }
}
$('#music-toggle').addEventListener('click', () => {
  if (!audio) return;
  if (audio.paused) playMusic();
  else { musicRequested = false; audio.pause(); $('#music-toggle').textContent = 'Play music'; $('#music-toggle').setAttribute('aria-pressed', 'false'); }
});
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('page-hidden', document.hidden);
  sceneVideos.forEach(updateSceneVideo);
  if (document.hidden) {
    openingVideo.pause();
    if (audio) audio.pause();
  } else {
    if (entranceState === 'playing') openingVideo.play().catch(finishOpening);
    if (musicRequested) playMusic();
  }
});

// Static copy is generated from this same file by scripts/build.mjs.
fetch('invitation.json').then(response => {
  if (!response.ok) throw new Error('Configuration unavailable');
  return response.json();
}).then(config => {
  document.querySelectorAll('[data-copy]').forEach(element => {
    const value = element.dataset.copy.split('.').reduce((object, key) => object?.[key], config);
    if (typeof value === 'string') element.textContent = value;
  });
  if (config.venue?.directions) document.querySelectorAll('[data-directions]').forEach(link => { link.href = config.venue.directions; });
  if (config.music?.src) {
    audio = new Audio(config.music.src);
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = .45;
    $('#music-toggle').hidden = false;
  }
}).catch(() => { /* All confirmed invitation details are also present in the HTML. */ });
