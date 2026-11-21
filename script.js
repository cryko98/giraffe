/* The Giraffe — $GIRAFFE · a flippable 1688 broadsheet */
(function () {
  "use strict";

  // ---- Fill these in later ------------------------------------------------
  var X_URL = "https://x.com/thegiraffepf";
  var CONTRACT_ADDRESS = "GwSkMEy1pRgNuMSdrApdX6DaexBopgLm5KU32VP9pump"; // $GIRAFFE on Solana
  // -------------------------------------------------------------------------

  var root = document.documentElement;
  var bookEl = document.getElementById("book");
  var pages = Array.prototype.slice.call(bookEl.querySelectorAll(".pg"));
  var N = pages.length;

  pages.forEach(function (p, i) { p.dataset.index = i; p.dataset.tex = i % 4; });

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ======================================================================
     TEXTURES — crumpled newsprint + walnut desk, rendered once to bitmaps
     ====================================================================== */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function svgImage(svg) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function toURL(canvas) {
    return new Promise(function (res) {
      if (canvas.toBlob) canvas.toBlob(function (b) { res(b ? URL.createObjectURL(b) : null); }, "image/jpeg", 0.84);
      else res(canvas.toDataURL("image/jpeg", 0.84));
    });
  }
  var grainCanvas = null;
  function grain() {
    if (grainCanvas) return grainCanvas;
    var c = document.createElement("canvas"); c.width = c.height = 220;
    var x = c.getContext("2d"), d = x.createImageData(220, 220);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = 150 + Math.random() * 105;
      d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return (grainCanvas = c);
  }

  function paperTexture(seed) {
    var W = 840, H = 1200, R = rng(seed * 977);
    var crumpleSvg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<filter id='f' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>" +
      "<feTurbulence type='turbulence' baseFrequency='0.0042 0.0055' numOctaves='4' seed='" + seed + "' result='t'/>" +
      "<feDiffuseLighting in='t' surfaceScale='2.2' diffuseConstant='1.05' lighting-color='#ffffff'>" +
      "<feDistantLight azimuth='225' elevation='52'/></feDiffuseLighting></filter>" +
      "<rect width='100%' height='100%' filter='url(#f)'/></svg>";

    return svgImage(crumpleSvg).then(function (crumple) {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var x = c.getContext("2d");

      x.fillStyle = "#ede4ce";
      x.fillRect(0, 0, W, H);

      // crumple relief
      if (crumple) {
        x.globalCompositeOperation = "multiply";
        x.globalAlpha = 0.55;
        x.filter = "brightness(1.32) contrast(1.25)";
        x.drawImage(crumple, 0, 0);
        x.globalCompositeOperation = "soft-light";
        x.globalAlpha = 0.5;
        x.filter = "none";
        x.drawImage(crumple, 0, 0);
        x.globalAlpha = 1;
      }

      // straight creases with faceted shading
      x.globalCompositeOperation = "source-over";
      for (var k = 0; k < 9; k++) {
        var horiz = R() > 0.5;
        var a = horiz ? { x: 0, y: R() * H } : { x: R() * W, y: 0 };
        var b = horiz ? { x: W, y: R() * H } : { x: R() * W, y: H };
        x.save();
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y);
        x.strokeStyle = "rgba(90,64,28," + (0.05 + R() * 0.08) + ")"; x.lineWidth = 1.1; x.stroke();
        x.translate(1.2, 1.2);
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y);
        x.strokeStyle = "rgba(255,252,240," + (0.25 + R() * 0.25) + ")"; x.lineWidth = 1; x.stroke();
        x.restore();
        // one side of the crease a shade darker
        x.save();
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y);
        if (horiz) { x.lineTo(W, H); x.lineTo(0, H); } else { x.lineTo(W, H); x.lineTo(W, 0); }
        x.closePath();
        x.fillStyle = "rgba(70,50,20," + (0.012 + R() * 0.02) + ")";
        x.fill();
        x.restore();
      }

      // the fold across the middle of every newspaper
      var fy = H * 0.5;
      var fold = x.createLinearGradient(0, fy - 26, 0, fy + 26);
      fold.addColorStop(0, "rgba(0,0,0,0)");
      fold.addColorStop(0.46, "rgba(80,58,25,.10)");
      fold.addColorStop(0.5, "rgba(60,42,18,.22)");
      fold.addColorStop(0.53, "rgba(255,250,235,.35)");
      fold.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = fold; x.fillRect(0, fy - 26, W, 52);

      // grain
      x.globalCompositeOperation = "multiply";
      x.globalAlpha = 0.35;
      x.fillStyle = x.createPattern(grain(), "repeat");
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;

      // foxing / age spots
      for (var s = 0; s < 16; s++) {
        var sx = R() * W, sy = R() * H, sr = 8 + R() * (R() > 0.85 ? 160 : 50);
        var g = x.createRadialGradient(sx, sy, 0, sx, sy, sr);
        g.addColorStop(0, "rgba(160,112,45," + (0.04 + R() * 0.1) + ")");
        g.addColorStop(1, "rgba(160,112,45,0)");
        x.fillStyle = g; x.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }
      // a faint coffee ring on some pages
      if (seed % 2 === 1) {
        var cx = W * (0.62 + R() * 0.25), cy = H * (0.08 + R() * 0.2), cr = 70 + R() * 30;
        x.strokeStyle = "rgba(120,80,30,.10)"; x.lineWidth = 5;
        x.beginPath(); x.arc(cx, cy, cr, 0.3, Math.PI * 1.85); x.stroke();
        x.strokeStyle = "rgba(120,80,30,.05)"; x.lineWidth = 14;
        x.beginPath(); x.arc(cx + 2, cy + 1, cr - 4, 0.5, Math.PI * 1.6); x.stroke();
      }

      // aged edges
      var e = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.78);
      e.addColorStop(0, "rgba(0,0,0,0)");
      e.addColorStop(1, "rgba(125,88,38,.42)");
      x.fillStyle = e; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = "source-over";
      x.strokeStyle = "rgba(110,78,34,.25)"; x.lineWidth = 6; x.strokeRect(0, 0, W, H);

      return toURL(c);
    });
  }

  function deskTexture() {
    var W = 1600, H = 1000;
    var svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<filter id='w' x='0' y='0' width='100%' height='100%'>" +
      "<feTurbulence type='fractalNoise' baseFrequency='0.0022 0.055' numOctaves='4' seed='11'/>" +
      "<feColorMatrix values='1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#w)'/></svg>";
    return svgImage(svg).then(function (img) {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var x = c.getContext("2d");
      x.fillStyle = "#4a2f1d"; x.fillRect(0, 0, W, H);
      if (img) {
        x.globalCompositeOperation = "multiply";
        x.filter = "contrast(2.2) brightness(.95)";
        x.drawImage(img, 0, 0);
        x.filter = "none";
      }
      x.globalCompositeOperation = "source-over";
      for (var y = 0; y < H; y += 200) {           // planks
        x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, y, W, 2);
        x.fillStyle = "rgba(255,210,160,.05)"; x.fillRect(0, y + 2, W, 1);
      }
      x.globalCompositeOperation = "multiply";
      x.globalAlpha = 0.5;
      x.fillStyle = x.createPattern(grain(), "repeat"); x.fillRect(0, 0, W, H);
      return toURL(c);
    });
  }

  function buildTextures() {
    var jobs = [0, 1, 2, 3].map(function (i) {
      return paperTexture(i + 3).then(function (url) { if (url) root.style.setProperty("--tex" + i, "url(" + url + ")"); });
    });
    jobs.push(deskTexture().then(function (url) { if (url) document.body.style.setProperty("--desk-tex", "url(" + url + ")"); }));
    return Promise.all(jobs);
  }
  setTimeout(buildTextures, 30);

  /* ======================================================================
     SMALL STUFF — dates, links, CA, edition
     ====================================================================== */
  var now = new Date();
  $all(".js-date").forEach(function (el) {
    el.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  });
  $all(".js-year").forEach(function (el) { el.textContent = now.getFullYear(); });

  $all("[data-x-link]").forEach(function (a) {
    a.setAttribute("href", X_URL);
    if (X_URL === "#") a.removeAttribute("target");
  });

  if (CONTRACT_ADDRESS) {
    var shortCA = CONTRACT_ADDRESS.slice(0, 6) + "…" + CONTRACT_ADDRESS.slice(-7);
    $all("[data-ca]").forEach(function (el) { el.textContent = CONTRACT_ADDRESS; el.classList.add("is-live"); });
    $all("[data-ca-short]").forEach(function (el) { el.textContent = shortCA; });
    $all("[data-action='copy-ca']").forEach(function (b) { b.disabled = false; });
  }

  function legacyCopy(text) {
    return new Promise(function (res, rej) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); }
      ta.remove();
    });
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function copyCA() {
    if (!CONTRACT_ADDRESS) return;
    copyText(CONTRACT_ADDRESS).then(function () {
      $all("[data-copy-label]").forEach(function (el) {
        if (!el.dataset.orig) el.dataset.orig = el.textContent;
        el.textContent = "Copied ✓";
        el.classList.add("is-copied");
      });
      thump(0, 0.35);
      clearTimeout(copyCA.t);
      copyCA.t = setTimeout(function () {
        $all("[data-copy-label]").forEach(function (el) { el.textContent = el.dataset.orig; el.classList.remove("is-copied"); });
      }, 1600);
    }, function () {});
  }

  var editionBtns = $all("[data-set-edition]");
  function setEdition(ed) {
    root.setAttribute("data-edition", ed);
    editionBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.setEdition === ed)); });
    $all(".js-logo").forEach(function (img) {
      var src = img.getAttribute(ed === "mono" ? "data-mono" : "data-gold");
      if (src && img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
    store("giraffe-edition-v3", ed);
  }
  var savedEd = store("giraffe-edition-v3");
  if (savedEd === "mono" || savedEd === "gold") setEdition(savedEd);
  editionBtns.forEach(function (b) { b.addEventListener("click", function () { setEdition(b.dataset.setEdition); }); });

  /* ======================================================================
     SOUND — synthesized paper rustle (no audio files)
     ====================================================================== */
  var soundBtn = document.getElementById("soundBtn");
  var soundOn = store("giraffe-sound") !== "off";
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    store("giraffe-sound", soundOn ? "on" : "off");
    if (soundOn) rustle(0.6);
  });
  var actx = null;
  function audio() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function noise(ctx, dur, crackle) {
    var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < crackle ? 1 : 0.32);
    var src = ctx.createBufferSource(); src.buffer = buf; return src;
  }
  function rustle(vol) {
    if (!soundOn) return;
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime, dur = 0.62;
    var src = noise(ctx, dur, 0.07);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 350;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * (vol || 1), t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.18 * (vol || 1), t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur);
    thump(0.78, 0.35 * (vol || 1));
  }
  function thump(delay, vol) {
    if (!soundOn) return;
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var src = noise(ctx, 0.12, 0.2);
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.4, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(lp); lp.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + 0.13);
  }

  /* ======================================================================
     SCARE THE GIRAFFE
     ====================================================================== */
  var PANIC = [
    "VOC shares down 40%!",
    "Short-sellers spread rumours on the Dam!",
    "Tulip Mania 2.0 feared!",
    "Whale dumps entire position!",
    "Fleet lost at sea — cargo gone!",
    "Contremineurs announce conspiracy!",
    "The chart is a staircase going down!",
    "Your cousin sold at the bottom!",
    "London claims better metaphors!",
    "Exchange closes early in panic!",
    "Experts: “This time it's different!”"
  ];
  var REPLY = ["Unbothered.", "Bought more.", "Still calm.", "Not scared.", "Holding.", "Yawned.", "Stood taller."];
  var scareCount = parseInt(store("giraffe-scares") || "0", 10) || 0;
  var lastPanic = -1;
  function paintCount() { $all("[data-scare-count]").forEach(function (el) { el.textContent = scareCount; }); }
  paintCount();
  function scare(box) {
    var news = box.querySelector("[data-scare-news]"), reply = box.querySelector("[data-scare-reply]");
    var i; do { i = Math.floor(Math.random() * PANIC.length); } while (i === lastPanic);
    lastPanic = i;
    news.textContent = PANIC[i];
    news.classList.remove("is-new"); reply.classList.remove("is-stamped");
    void news.offsetWidth;
    news.classList.add("is-new");
    setTimeout(function () {
      reply.textContent = REPLY[Math.floor(Math.random() * REPLY.length)];
      reply.classList.add("is-stamped");
      thump(0, 0.6);
    }, 520);
    scareCount++; store("giraffe-scares", String(scareCount)); paintCount();
  }

  /* ======================================================================
     PAGE FLIP
     ====================================================================== */
  if (!window.St || !window.St.PageFlip) {
    root.classList.add("no-flip");
    bindDelegates(null);
    return;
  }

  var shadowEl = document.createElement("div");
  shadowEl.className = "book-shadow";
  bookEl.appendChild(shadowEl);

  function wantsPortrait() {
    var W = bookEl.clientWidth, H = bookEl.clientHeight;
    var spread = Math.min(W / 2, H * 0.7), single = Math.min(W, H * 0.7);
    return spread < single * 0.72;
  }
  function modeMinWidth() { return wantsPortrait() ? bookEl.clientWidth + 10 : 1; }

  // must be registered before PageFlip so it runs before the library's own resize handler
  var pf;
  window.addEventListener("resize", function () {
    if (!pf) return;
    pf.getSettings().minWidth = modeMinWidth();
    requestAnimationFrame(function () { layout(); });
  });

  pf = new St.PageFlip(bookEl, {
    width: 560,
    height: 800,
    size: "stretch",
    minWidth: modeMinWidth(),
    maxWidth: 3000,
    minHeight: 1,
    maxHeight: 4000,
    autoSize: false,
    showCover: true,
    usePortrait: true,
    flippingTime: 950,
    maxShadowOpacity: 0.6,
    drawShadow: true,
    showPageCorners: true,
    disableFlipByClick: true,
    mobileScrollSupport: false,
    clickEventForward: true,
    swipeDistance: 30,
    startZIndex: 0
  });
  pf.loadFromHTML(pages);
  bookEl.style.minWidth = "";
  bookEl.style.minHeight = "";

  // Library bug: flipNext()/flipPrev() aim at fixed points (x = 10, y = 1) measured from the
  // container's edge, which miss the book whenever it is centred inside a larger container
  // (prev never worked; next failed whenever the page was vertically centred). Aim at the
  // real corners of the visible page instead.
  window.giraffeBook = pf; // handy for debugging in the console
  var flipCtl = pf.getFlipController();
  // Its corner hit-test is also wrong for the single page in portrait mode, so programmatic
  // flips skip that test (it only exists to stop accidental clicks, not buttons/keys).
  function cornerY(r, corner) { return corner === "bottom" ? r.top + r.height - 2 : r.top + 1; }
  function programmaticFlip(ctl, pos) {
    var s = pf.getSettings(), prev = s.disableFlipByClick;
    s.disableFlipByClick = false;
    try { ctl.flip(pos); } finally { s.disableFlipByClick = prev; }
  }
  flipCtl.flipNext = function (corner) {
    var r = pf.getRender().getRect();
    programmaticFlip(this, { x: r.left + r.pageWidth * 2 - 10, y: cornerY(r, corner) });
  };
  flipCtl.flipPrev = function (corner) {
    var r = pf.getRender().getRect();
    var left = pf.getOrientation() === "portrait" ? r.left + r.pageWidth : r.left;
    programmaticFlip(this, { x: left + 10, y: cornerY(r, corner) });
  };

  function soften() {
    try { pf.getPage(0).setDensity("soft"); pf.getPage(N - 1).setDensity("soft"); } catch (e) {}
  }
  soften();

  function isPortrait() { return pf.getOrientation() === "portrait"; }

  function visiblePages() {
    var i = pf.getCurrentPageIndex();
    if (isPortrait()) return [i];
    if (i === 0) return [0];
    if (i >= N - 1) return [N - 1];
    var left = i % 2 === 1 ? i : i - 1;
    return left + 1 < N - 1 ? [left, left + 1] : [left];
  }

  function markSides() {
    var portrait = isPortrait();
    pages.forEach(function (p, i) {
      var left = !portrait && i % 2 === 1;
      p.classList.toggle("pg--left", left);
      p.classList.toggle("pg--right", !left);
    });
  }

  var opening = false;
  function layout() {
    var r = pf.getRender().getRect();
    if (!r) return;
    var pw = r.pageWidth, vis = visiblePages(), x, w, shift = 0;
    if (isPortrait()) { x = r.left + pw; w = pw; }
    else if (!opening && vis.length === 1 && vis[0] === 0) { x = r.left + pw; w = pw; shift = -pw / 2; }
    else if (!opening && vis.length === 1 && vis[0] === N - 1) { x = r.left; w = pw; shift = pw / 2; }
    else { x = r.left; w = pw * 2; }
    shadowEl.style.left = x + "px";
    shadowEl.style.top = r.top + "px";
    shadowEl.style.width = w + "px";
    shadowEl.style.height = r.height + "px";
    bookEl.style.setProperty("--shift", shift + "px");
  }

  // ---- pager UI ----
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var label = document.getElementById("pagerLabel");
  var hint = document.getElementById("pagerHint");
  var track = document.getElementById("pagerTrack");
  pages.forEach(function (p, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.goto = i;
    b.setAttribute("aria-label", "Page " + (i + 1) + ": " + p.dataset.title);
    b.setAttribute("tabindex", "-1");
    track.appendChild(b);
  });
  var trackBtns = $all("button", track);
  var tabBtns = $all(".tabs [data-goto]");
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  function updateUI() {
    var vis = visiblePages();
    var titles = vis.map(function (i) { return pages[i].getAttribute("data-title"); });
    var nums = vis.map(function (i) { return i + 1; });
    label.textContent = (vis[0] === 0 ? "Front Page" : (nums.length > 1 ? "Pages " + nums.join("–") : "Page " + nums[0]) + " · " + titles.join(" / "));
    trackBtns.forEach(function (b, i) { b.classList.toggle("is-on", vis.indexOf(i) !== -1); });
    tabBtns.forEach(function (b) { b.classList.toggle("is-active", vis.indexOf(+b.dataset.goto) !== -1); });
    prevBtn.disabled = vis[0] === 0;
    nextBtn.disabled = vis[vis.length - 1] === N - 1;
    hint.textContent = isPortrait()
      ? (coarse ? "Swipe to turn · tap a page to read it" : "Drag a corner or use ← → · 🔍 to read up close")
      : "Drag a corner, click the arrows, or use ← → keys";
    vis.forEach(function (i) {
      $all(".chart, .beasts", pages[i]).forEach(function (el) { el.classList.add("is-in"); });
    });
  }

  pf.on("flip", function () {
    root.classList.add("has-flipped");
    opening = false;
    layout();
    updateUI();
  });
  pf.on("changeState", function (e) {
    if (e.data === "flipping") {
      rustle(1);
      var vis = visiblePages();
      if (!isPortrait() && vis.length === 1) { opening = true; layout(); }
    }
    if (e.data === "read") { opening = false; layout(); updateUI(); }
  });
  pf.on("changeOrientation", function () {
    soften(); markSides();
    requestAnimationFrame(function () { layout(); updateUI(); });
  });

  markSides();
  layout();
  updateUI();
  // fonts change nothing in geometry, but re-measure once everything is in
  window.addEventListener("load", function () { layout(); });

  // the app never scrolls; undo any accidental scroll (focus, flip overflow)
  window.addEventListener("scroll", function () { if (window.scrollY) window.scrollTo(0, 0); });

  prevBtn.addEventListener("click", function () { pf.flipPrev("top"); });
  nextBtn.addEventListener("click", function () { pf.flipNext("top"); });

  document.addEventListener("keydown", function (e) {
    if (!readerEl.hidden) { if (e.key === "Escape") closeReader(); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown") { pf.flipNext("top"); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { pf.flipPrev("top"); e.preventDefault(); }
    else if (e.key === "Home") goTo(0);
    else if (e.key === "End") goTo(N - 1);
  });

  function goTo(i) {
    i = Math.max(0, Math.min(N - 1, i));
    if (visiblePages().indexOf(i) !== -1) return;
    if (pf.getState() !== "read") return;
    pf.flip(i, "top");
  }

  // tap a page on touch screens (portrait) to read it up close
  var downAt = null;
  bookEl.addEventListener("pointerdown", function (e) { downAt = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  bookEl.addEventListener("click", function (e) {
    if (!coarse || !isPortrait() || !downAt) return;
    if (e.target.closest("a, button")) return;
    var moved = Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y);
    if (moved < 10 && Date.now() - downAt.t < 400 && pf.getState() === "read") openReader();
  });

  /* ======================================================================
     READER (up-close, scrollable)
     ====================================================================== */
  var readerEl = document.getElementById("reader");
  var readerScroll = document.getElementById("readerScroll");
  var readerPending = false;
  pf.on("changeState", function (e) { if (e.data === "read" && readerPending) { readerPending = false; openReader(); } });
  function openReader() {
    if (pf.getState() !== "read") { readerPending = true; return; }
    readerScroll.innerHTML = "";
    visiblePages().forEach(function (i) {
      var wrap = document.createElement("article");
      wrap.className = "reader__page";
      wrap.style.backgroundImage = "var(--tex" + (i % 4) + ")";
      var inner = pages[i].querySelector(".pg__inner").cloneNode(true);
      $all("[id]", inner).forEach(function (el) { el.removeAttribute("id"); });
      $all(".chart, .beasts", inner).forEach(function (el) { el.classList.add("is-in"); });
      wrap.appendChild(inner);
      readerScroll.appendChild(wrap);
    });
    readerEl.hidden = false;
    readerScroll.scrollTop = 0;
    thump(0, 0.3);
  }
  function closeReader() { readerEl.hidden = true; readerScroll.innerHTML = ""; }
  readerEl.addEventListener("click", function (e) { if (e.target === readerEl || e.target === readerScroll) closeReader(); });

  bindDelegates(goTo);

  /* ======================================================================
     DELEGATED ACTIONS (work in the book and in reader clones)
     ====================================================================== */
  function bindDelegates(go) {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-goto], [data-action], [data-x-link]");
      if (!t) return;
      if (t.hasAttribute("data-x-link") && X_URL === "#") { e.preventDefault(); return; }
      if (t.hasAttribute("data-goto")) {
        e.preventDefault();
        if (readerEl && !readerEl.hidden) closeReader();
        if (go) go(parseInt(t.dataset.goto, 10));
        return;
      }
      var act = t.dataset.action;
      if (act === "scare") scare(t.closest("[data-scare]"));
      else if (act === "read" && pf) openReader();
      else if (act === "close-reader") closeReader();
      else if (act === "copy-ca") copyCA();
    });
  }
})();
