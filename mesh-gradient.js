/**
 * mesh-gradient.js
 * Vanilla WebGL port of @paper-design/shaders-react <MeshGradient />.
 * Creates a fullscreen animated gradient mesh on a <canvas> element.
 * Colors adapted to the Cycloidals palette (black → navy → cyan glow).
 *
 * Usage:
 *   const mg = MeshGradient({ container, colors, speed });
 *   mg.destroy(); // cleanup
 */
(function (global) {
  'use strict';

  // ── GLSL shaders ────────────────────────────────────────────
  const VERT = `
    attribute vec2 a_pos;
    varying   vec2 v_uv;
    void main() {
      v_uv        = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // 4-colour smooth-noise mesh gradient.
  // Each colour occupies a softly-animated "blob" whose centre drifts
  // over time, producing the flowing gradient-mesh feel.
  const FRAG = `
    precision highp float;

    uniform float     u_time;
    uniform vec2      u_res;
    uniform vec3      u_c0;   // colour 0
    uniform vec3      u_c1;   // colour 1
    uniform vec3      u_c2;   // colour 2
    uniform vec3      u_c3;   // colour 3
    uniform float     u_speed;

    varying vec2 v_uv;

    // --- helpers ---
    float smoothHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Smooth value noise (quintic)
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

      float a = smoothHash(i);
      float b = smoothHash(i + vec2(1.0, 0.0));
      float c = smoothHash(i + vec2(0.0, 1.0));
      float d = smoothHash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2  s = vec2(1.0);
      for (int i = 0; i < 5; i++) {
        v += a * noise(p * s);
        s *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    // Radial blob weight: how much colour i contributes at uv
    // given that blob i is centred at pos (which drifts with time).
    float blobWeight(vec2 uv, vec2 centre, float spread) {
      float d = length(uv - centre);
      return exp(-d * d / (spread * spread));
    }

    void main() {
      vec2 uv  = v_uv;
      float t  = u_time * u_speed;

      // Aspect-corrected UVs so blobs aren't oval
      float asp   = u_res.x / u_res.y;
      vec2  uvAsp = vec2(uv.x * asp, uv.y);

      // Warp UVs slightly with fbm for the organic mesh look
      float warp  = 1.8;
      vec2  wUv   = uvAsp + vec2(
        fbm(uv * 2.5 + vec2(t * 0.12, 0.0)) - 0.5,
        fbm(uv * 2.5 + vec2(0.0, t * 0.09)) - 0.5
      ) * warp;

      // Four blob centres drift around the canvas
      float asp05 = asp * 0.5;
      vec2 c0 = vec2(asp05 + sin(t * 0.23) * asp05 * 0.6,
                     0.5  + cos(t * 0.19) * 0.35);
      vec2 c1 = vec2(asp05 + cos(t * 0.17) * asp05 * 0.7,
                     0.5  + sin(t * 0.21) * 0.40);
      vec2 c2 = vec2(asp05 + sin(t * 0.13 + 2.1) * asp05 * 0.65,
                     0.5  + cos(t * 0.15 + 1.3) * 0.38);
      vec2 c3 = vec2(asp05 + cos(t * 0.20 + 3.5) * asp05 * 0.55,
                     0.5  + sin(t * 0.18 + 0.7) * 0.42);

      float spread = asp * 0.55;

      float w0 = blobWeight(wUv, c0, spread);
      float w1 = blobWeight(wUv, c1, spread);
      float w2 = blobWeight(wUv, c2, spread);
      float w3 = blobWeight(wUv, c3, spread);

      float wSum = w0 + w1 + w2 + w3 + 0.0001;

      vec3 colour = (u_c0 * w0 + u_c1 * w1 + u_c2 * w2 + u_c3 * w3) / wSum;

      // Subtle vignette
      float vig = 1.0 - length((uv - 0.5) * vec2(1.0, 1.0 / asp) * 1.4);
      vig        = clamp(vig, 0.0, 1.0);
      vig        = pow(vig, 0.6);
      colour    *= mix(0.3, 1.0, vig);

      gl_FragColor = vec4(colour, 1.0);
    }
  `;

  // ── helpers ─────────────────────────────────────────────────
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createProgram(gl, vertSrc, fragSrc) {
    const vs  = compileShader(gl, gl.VERTEX_SHADER,   vertSrc);
    const fs  = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prg));
      return null;
    }
    return prg;
  }

  // ── public factory ──────────────────────────────────────────
  function MeshGradient({ container, colors = ['#000000','#030312','#041c1c','#001a18'], speed = 0.6 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.insertBefore(canvas, container.firstChild);

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) { console.warn('WebGL not supported'); return { destroy: () => {} }; }

    const program = createProgram(gl, VERT, FRAG);
    gl.useProgram(program);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTime  = gl.getUniformLocation(program, 'u_time');
    const uRes   = gl.getUniformLocation(program, 'u_res');
    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    const uC     = [0,1,2,3].map(i => gl.getUniformLocation(program, `u_c${i}`));

    // Upload colours
    const palette = [...colors];
    while (palette.length < 4) palette.push('#000000');
    palette.slice(0,4).forEach((hex, i) => {
      const rgb = hexToRgb(hex.length === 4
        ? '#' + [...hex.slice(1)].map(c => c+c).join('')
        : hex);
      gl.uniform3fv(uC[i], rgb);
    });

    gl.uniform1f(uSpeed, speed);

    // Resize
    function resize() {
      const w = container.clientWidth  || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      canvas.width  = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    resize();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resize)
      : null;
    if (ro) ro.observe(container);
    else window.addEventListener('resize', resize);

    // Render loop
    let raf, start = null;
    function render(ts) {
      if (start === null) start = ts;
      gl.uniform1f(uTime, (ts - start) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', resize);
        canvas.remove();
      }
    };
  }

  global.MeshGradient = MeshGradient;
})(window);
