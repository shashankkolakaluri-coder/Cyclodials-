/**
 * Etheral Shadow background — vanilla JS port of the Framer/React component.
 * Applies an animated turbulence-displacement SVG filter over a masked shadow
 * blob, creating an organic glowing background. Added as a fixed layer at
 * z-index -2 (behind the cyber grid at 0 and Three.js gears at -1).
 */
(function () {
  'use strict';

  // ── Config (mirrors demo props) ──────────────────────────────
  const COLOR        = 'rgba(128, 128, 128, 1)';
  const ANIM_SCALE   = 100;
  const ANIM_SPEED   = 90;
  const NOISE_OPACITY = 1;
  const NOISE_SCALE  = 1.2;

  // ── Helpers ──────────────────────────────────────────────────
  function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
    if (fromLow === fromHigh) return toLow;
    const pct = (value - fromLow) / (fromHigh - fromLow);
    return toLow + pct * (toHigh - toLow);
  }

  const displacementScale = mapRange(ANIM_SCALE, 1, 100, 20, 100);   // 100
  const animDuration      = mapRange(ANIM_SPEED, 1, 100, 1000, 50) / 25; // ~5.8s per rotation
  const baseFreqX         = mapRange(ANIM_SCALE, 0, 100, 0.001, 0.0005);
  const baseFreqY         = mapRange(ANIM_SCALE, 0, 100, 0.004, 0.002);
  const FILTER_ID         = 'etheral-shadow-filter';

  // ── Build DOM ────────────────────────────────────────────────
  const ns = 'http://www.w3.org/2000/svg';

  // Outer wrapper — full-screen fixed, z-index behind everything else
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position:      'fixed',
    inset:         '0',
    zIndex:        '-2',
    overflow:      'hidden',
    pointerEvents: 'none',
    width:         '100%',
    height:        '100%'
  });

  // Inner layer — expands beyond wrapper to avoid filter edge clipping
  const inner = document.createElement('div');
  const inset = displacementScale + 'px';
  Object.assign(inner.style, {
    position: 'absolute',
    top:      `-${inset}`,
    left:     `-${inset}`,
    right:    `-${inset}`,
    bottom:   `-${inset}`,
    filter:   `url(#${FILTER_ID}) blur(4px)`
  });

  // SVG containing the turbulence filter
  const svg = document.createElementNS(ns, 'svg');
  Object.assign(svg.style, { position: 'absolute', width: '0', height: '0', overflow: 'visible' });

  const defs   = document.createElementNS(ns, 'defs');
  const filter = document.createElementNS(ns, 'filter');
  filter.setAttribute('id', FILTER_ID);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');

  const feTurb = document.createElementNS(ns, 'feTurbulence');
  feTurb.setAttribute('result',        'undulation');
  feTurb.setAttribute('numOctaves',    '2');
  feTurb.setAttribute('baseFrequency', `${baseFreqX},${baseFreqY}`);
  feTurb.setAttribute('seed',          '0');
  feTurb.setAttribute('type',          'turbulence');

  const feHue = document.createElementNS(ns, 'feColorMatrix');
  feHue.setAttribute('in',     'undulation');
  feHue.setAttribute('type',   'hueRotate');
  feHue.setAttribute('values', '180');

  const feMatrix = document.createElementNS(ns, 'feColorMatrix');
  feMatrix.setAttribute('in',     'dist');
  feMatrix.setAttribute('result', 'circulation');
  feMatrix.setAttribute('type',   'matrix');
  feMatrix.setAttribute('values', '4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0');

  const feDisp1 = document.createElementNS(ns, 'feDisplacementMap');
  feDisp1.setAttribute('in',     'SourceGraphic');
  feDisp1.setAttribute('in2',    'circulation');
  feDisp1.setAttribute('scale',  String(displacementScale));
  feDisp1.setAttribute('result', 'dist');

  const feDisp2 = document.createElementNS(ns, 'feDisplacementMap');
  feDisp2.setAttribute('in',     'dist');
  feDisp2.setAttribute('in2',    'undulation');
  feDisp2.setAttribute('scale',  String(displacementScale));
  feDisp2.setAttribute('result', 'output');

  filter.append(feTurb, feHue, feMatrix, feDisp1, feDisp2);
  defs.appendChild(filter);
  svg.appendChild(defs);

  // Masked shadow blob
  const blob = document.createElement('div');
  const maskUrl = "url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')";
  Object.assign(blob.style, {
    backgroundColor:      COLOR,
    maskImage:            maskUrl,
    WebkitMaskImage:      maskUrl,
    maskSize:             'cover',
    WebkitMaskSize:       'cover',
    maskRepeat:           'no-repeat',
    WebkitMaskRepeat:     'no-repeat',
    maskPosition:         'center',
    WebkitMaskPosition:   'center',
    width:                '100%',
    height:               '100%'
  });

  inner.append(svg, blob);
  wrapper.appendChild(inner);

  // Noise overlay
  if (NOISE_OPACITY > 0) {
    const noise = document.createElement('div');
    const noiseUrl = '"https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png"';
    Object.assign(noise.style, {
      position:            'absolute',
      inset:               '0',
      backgroundImage:     `url(${noiseUrl})`,
      backgroundSize:      `${NOISE_SCALE * 200}px`,
      backgroundRepeat:    'repeat',
      opacity:             String(NOISE_OPACITY / 2),
      pointerEvents:       'none'
    });
    wrapper.appendChild(noise);
  }

  // Insert as first child of body so it sits beneath everything
  document.body.insertBefore(wrapper, document.body.firstChild);

  // ── Animation: continuously rotate hue to animate turbulence ─
  let startTime = null;
  function frame(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000; // seconds
    // Full 360° rotation every animDuration seconds
    const hue = (elapsed % animDuration) / animDuration * 360;
    feHue.setAttribute('values', String(hue));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
