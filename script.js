/* The Giraffe — $GIRAFFE */
(function () {
  "use strict";

  // ---- Links you will fill in later --------------------------------------
  var X_URL = "#";          // e.g. "https://x.com/yourhandle"
  var CONTRACT_ADDRESS = ""; // paste the Solana CA here when live
  // -------------------------------------------------------------------------

  var root = document.documentElement;

  // X links
  document.querySelectorAll("[data-x-link]").forEach(function (a) {
    a.setAttribute("href", X_URL);
    if (X_URL === "#") {
      a.removeAttribute("target");
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
  });

  // Contract address
  var caEl = document.getElementById("ca");
  var caBtn = document.getElementById("caCopy");
  if (CONTRACT_ADDRESS && caEl && caBtn) {
    caEl.textContent = CONTRACT_ADDRESS;
    caEl.style.fontStyle = "normal";
    caEl.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    caEl.style.fontSize = "15px";
    caBtn.disabled = false;
    caBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(CONTRACT_ADDRESS).then(function () {
        caBtn.textContent = "Copied";
        setTimeout(function () { caBtn.textContent = "Copy"; }, 1600);
      });
    });
  }

  // Dateline: "Saturday, 21 November — reprinted from Anno 1688"
  var dl = document.getElementById("dateline");
  var yr = document.getElementById("year");
  var now = new Date();
  if (dl) {
    dl.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (yr) yr.textContent = now.getFullYear();

  // Edition switch (Green / Monochrome)
  var logos = document.querySelectorAll(".js-logo");
  var buttons = document.querySelectorAll("[data-set-edition]");

  function setEdition(ed) {
    root.setAttribute("data-edition", ed);
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-edition") === ed));
    });
    logos.forEach(function (img) {
      var src = img.getAttribute(ed === "mono" ? "data-mono" : "data-green");
      if (src && img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
    try { localStorage.setItem("giraffe-edition", ed); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem("giraffe-edition"); } catch (e) {}
  if (saved === "mono" || saved === "green") setEdition(saved);

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { setEdition(b.getAttribute("data-set-edition")); });
  });

  // Ticker tape: duplicate content for a seamless loop
  var tape = document.getElementById("tape");
  if (tape) tape.innerHTML += tape.innerHTML;

  // Reveal on scroll
  var targets = document.querySelectorAll(".reveal, .chart");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("is-in"); });
  }
})();
