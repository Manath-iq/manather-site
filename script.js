(() => {
  "use strict";

  /* Nav background once the page is scrolled past the top sentinel */
  const nav = document.getElementById("nav");
  const sentinel = document.getElementById("nav-sentinel");
  if (nav && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle("is-scrolled", !entry.isIntersecting);
    }).observe(sentinel);
  } else if (nav) {
    nav.classList.add("is-scrolled");
  }

  /* Reveal-on-scroll with a small stagger between siblings entering together */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll(".reveal");
  const show = (el, delay) => {
    el.style.setProperty("--reveal-delay", `${Math.min(delay, 0.32)}s`);
    el.classList.add("is-visible");
  };
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      let delay = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target, delay);
        io.unobserve(entry.target);
        delay += 0.08;
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    /* Elements already in the first viewport appear immediately; the
       observer only handles what is below the fold. */
    let initial = 0;
    const fold = window.innerHeight * 0.95;
    revealEls.forEach((el) => {
      if (el.getBoundingClientRect().top < fold) {
        show(el, initial);
        initial += 0.08;
      } else {
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* Living aurora: a few drifting radial blobs on a tiny canvas, blurred and
     blended by CSS. Low internal resolution keeps it near-free to draw. */
  const auroraCanvas = document.querySelector(".aurora-canvas");
  if (auroraCanvas && !reduceMotion) {
    const ctx = auroraCanvas.getContext("2d");
    const W = 240;
    let H = 150;
    const BLOBS = [
      { rgb: "47,182,168", r: 0.55, x: 0.62, y: 0.24, sx: 0.09, sy: 0.07, v: 0.000045, ph: 0.0, a: 0.5 },
      { rgb: "44,96,203",  r: 0.45, x: 0.16, y: 0.18, sx: 0.08, sy: 0.09, v: 0.000034, ph: 2.1, a: 0.38 },
      { rgb: "230,169,43", r: 0.38, x: 0.88, y: 0.52, sx: 0.07, sy: 0.08, v: 0.000027, ph: 4.2, a: 0.22 },
      { rgb: "74,212,196", r: 0.34, x: 0.42, y: 0.62, sx: 0.1,  sy: 0.06, v: 0.000052, ph: 1.2, a: 0.3 },
    ];
    const sizeCanvas = () => {
      const rect = auroraCanvas.getBoundingClientRect();
      H = Math.max(80, Math.round(W * (rect.height / Math.max(rect.width, 1))));
      auroraCanvas.width = W;
      auroraCanvas.height = H;
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    let rafId = 0;
    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const b of BLOBS) {
        const cx = (b.x + Math.sin(t * b.v + b.ph) * b.sx) * W;
        const cy = (b.y + Math.cos(t * b.v * 1.3 + b.ph) * b.sy) * H;
        const r = b.r * W;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(${b.rgb},${b.a})`);
        g.addColorStop(1, `rgba(${b.rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    });
  }

  /* Hero headline: split into words for a staggered entrance. The h1 keeps an
     aria-label with the original sentence; visual spans are decorative. */
  const heroTitle = document.querySelector(".hero-title");
  if (heroTitle && !reduceMotion) {
    const original = heroTitle.textContent.replace(/\s+/g, " ").trim();
    heroTitle.setAttribute("aria-label", original);
    let i = 0;
    const splitWords = (el) => {
      [...el.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
            } else {
              const w = document.createElement("span");
              w.className = "w";
              w.setAttribute("aria-hidden", "true");
              w.style.setProperty("--i", i++);
              w.textContent = part;
              frag.appendChild(w);
            }
          });
          el.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          splitWords(node);
        }
      });
    };
    splitWords(heroTitle);
    heroTitle.classList.remove("reveal");
  }

  /* Cursor spotlight on cards: updates CSS vars only, no layout work */
  if (window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".spot").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* Copy buttons */
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const label = btn.lastChild;
        btn.classList.add("is-copied");
        label.textContent = "Copied";
        setTimeout(() => {
          btn.classList.remove("is-copied");
          label.textContent = "Copy";
        }, 1600);
      } catch {
        /* clipboard unavailable: leave the button as-is */
      }
    });
  });

  /* Context-pack format tabs: swap the brief filename in the tree */
  const brief = document.querySelector(".tree-brief");
  const packTabs = document.querySelectorAll(".tab[data-format]");
  packTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      packTabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      if (brief) brief.textContent = tab.dataset.format;
    });
  });

  /* Gallery tabs */
  const shots = {
    library: {
      src: "assets/library.webp",
      alt: "The Manather library: masonry grid with color filter and search",
      caption: "The library: a masonry grid with color filter and search.",
    },
    board: {
      src: "assets/board.webp",
      alt: "A Manather board: infinite canvas with images, notes, shapes, and arrows",
      caption: "Boards: an infinite canvas with pan, zoom, and PNG export.",
    },
    collections: {
      src: "assets/collections.webp",
      alt: "Manather collections: groups of assets shown as stacked cards",
      caption: "Collections: group saves together, one asset can live in several.",
    },
  };
  const shotImg = document.getElementById("gallery-shot");
  const shotCaption = document.getElementById("gallery-caption");
  const galleryTabs = document.querySelectorAll(".tab[data-shot]");
  galleryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const shot = shots[tab.dataset.shot];
      if (!shot || !shotImg) return;
      galleryTabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      shotImg.classList.add("is-fading");
      const swap = () => {
        shotImg.src = shot.src;
        shotImg.alt = shot.alt;
        if (shotCaption) shotCaption.textContent = shot.caption;
        shotImg.decode().catch(() => {}).finally(() => shotImg.classList.remove("is-fading"));
      };
      reduceMotion ? swap() : setTimeout(swap, 180);
    });
  });

  /* Live GitHub numbers; the static fallback text stays if anything fails */
  const REPO = "Manath-iq/Manather";
  const compact = (n) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : `${n}`;

  const setStat = (name, value, label) => {
    document.querySelectorAll(`[data-stat="${name}"]`).forEach((el) => {
      el.textContent = value;
      el.hidden = false;
    });
    document.querySelectorAll(`[data-stat-label="${name}"]`).forEach((el) => {
      el.textContent = label;
    });
  };

  fetch(`https://api.github.com/repos/${REPO}`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((repo) => {
      if (Number.isFinite(repo.stargazers_count)) {
        setStat("stars", compact(repo.stargazers_count), "stars on GitHub");
      }
    })
    .catch(() => {});

  fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((releases) => {
      const total = releases.reduce(
        (sum, rel) => sum + rel.assets.reduce((s, a) => s + a.download_count, 0),
        0
      );
      if (total > 0) setStat("downloads", compact(total), "downloads");
    })
    .catch(() => {});
})();
