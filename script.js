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

  /* Mobile menu: hamburger toggles the dropdown under the nav pill */
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  if (nav && navToggle && navMenu) {
    const setMenu = (open) => {
      nav.classList.toggle("menu-open", open);
      navMenu.hidden = !open;
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    navToggle.addEventListener("click", () => setMenu(navMenu.hidden));
    navMenu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setMenu(false))
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !navMenu.hidden) setMenu(false);
    });
    /* Close the dropdown if the viewport grows into the desktop layout */
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
      if (e.matches) setMenu(false);
    });
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
    let onScreen = true;
    let lastFrame = 0;
    const draw = (t) => {
      rafId = requestAnimationFrame(draw);
      if (t - lastFrame < 33) return; /* ~30fps is visually identical under the blur */
      lastFrame = t;
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
    };
    const syncLoop = () => {
      cancelAnimationFrame(rafId);
      if (onScreen && !document.hidden) rafId = requestAnimationFrame(draw);
    };
    syncLoop();
    document.addEventListener("visibilitychange", syncLoop);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        syncLoop();
      }).observe(auroraCanvas);
    }
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
  const canHover = window.matchMedia("(hover: hover)").matches;
  /* Rects are cached on pointerenter so pointermove never forces layout */
  if (canHover) {
    document.querySelectorAll(".spot").forEach((el) => {
      let rect = null;
      el.addEventListener("pointerenter", () => { rect = el.getBoundingClientRect(); });
      el.addEventListener("pointermove", (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* Magnetic CTAs: the button leans a few px toward the cursor */
  if (canHover && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      let rect = null;
      el.addEventListener("pointerenter", () => { rect = el.getBoundingClientRect(); });
      el.addEventListener("pointermove", (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.setProperty("--tx", `${(dx * 5).toFixed(1)}px`);
        el.style.setProperty("--ty", `${(dy * 4).toFixed(1)}px`);
      });
      el.addEventListener("pointerleave", () => {
        rect = null;
        el.style.setProperty("--tx", "0px");
        el.style.setProperty("--ty", "0px");
      });
    });
  }

  /* Hero: flip the library screenshot between dark and light themes */
  const themeFlip = document.getElementById("theme-flip");
  const heroShot = document.getElementById("hero-shot");
  if (themeFlip && heroShot) {
    const THEMES = {
      dark: { src: "assets/cover.webp", label: "Show the light theme" },
      light: { src: "assets/light.webp", label: "Show the dark theme" },
    };
    let lightOn = false;
    new Image().src = THEMES.light.src; /* warm the swap */
    themeFlip.addEventListener("click", () => {
      lightOn = !lightOn;
      const next = lightOn ? THEMES.light : THEMES.dark;
      heroShot.classList.add("is-fading");
      const img = new Image();
      img.src = next.src;
      img.decode().catch(() => {}).finally(() => {
        heroShot.src = next.src;
        heroShot.classList.remove("is-fading");
      });
      themeFlip.setAttribute("aria-pressed", String(lightOn));
      themeFlip.setAttribute("aria-label", next.label);
      themeFlip.classList.toggle("is-light", lightOn);
    });
  }

  /* Hero window: subtle 3D tilt following the cursor */
  const heroStage = document.querySelector(".hero-stage");
  const heroWin = heroStage ? heroStage.querySelector(".window") : null;
  if (heroStage && heroWin && canHover && !reduceMotion) {
    let rect = null;
    heroStage.addEventListener("pointerenter", () => { rect = heroStage.getBoundingClientRect(); });
    heroStage.addEventListener("pointermove", (e) => {
      if (!rect) rect = heroStage.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - 0.5;
      const dy = (e.clientY - rect.top) / rect.height - 0.5;
      heroWin.style.setProperty("--ry", `${(dx * 3).toFixed(2)}deg`);
      heroWin.style.setProperty("--rx", `${(-dy * 2.4).toFixed(2)}deg`);
    });
    heroStage.addEventListener("pointerleave", () => {
      rect = null;
      heroWin.style.setProperty("--rx", "0deg");
      heroWin.style.setProperty("--ry", "0deg");
    });
  }

  /* Scrollspy: highlight the nav link for the section on screen */
  if ("IntersectionObserver" in window) {
    const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) =>
            a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`)
          );
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    navLinks.forEach((a) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) spy.observe(target);
    });
  }

  /* Copy buttons */
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const label = btn.querySelector(".copy-label");
        btn.classList.add("is-copied");
        if (label) label.textContent = "Copied";
        clearTimeout(btn._copyTimer);
        btn._copyTimer = setTimeout(() => {
          btn.classList.remove("is-copied");
          if (label) label.textContent = "Copy";
        }, 1600);
      } catch {
        /* clipboard unavailable: leave the button as-is */
      }
    });
  });

  /* How it works: click to switch, auto-advance while on screen */
  const howGrid = document.querySelector(".how-grid");
  if (howGrid) {
    const steps = [...howGrid.querySelectorAll(".how-step")];
    const panes = [...howGrid.querySelectorAll(".how-pane")];
    const INTERVAL = 6000;
    howGrid.style.setProperty("--how-interval", `${INTERVAL}ms`);
    let timer = null;
    let idx = 0;
    const activate = (i) => {
      idx = i;
      steps.forEach((s, n) => {
        s.classList.toggle("is-active", n === i);
        s.setAttribute("aria-pressed", n === i ? "true" : "false");
        if (n === i) {
          const bar = s.querySelector(".how-progress i");
          bar.style.animation = "none";
          void bar.offsetWidth;
          bar.style.animation = "";
        }
      });
      panes.forEach((p) => p.classList.toggle("is-active", p.dataset.pane === steps[i].dataset.step));
    };
    let resumeTimer = 0;
    let inView = false;
    const startAuto = () => {
      if (reduceMotion || timer || !inView) return;
      howGrid.classList.add("how-auto");
      timer = setInterval(() => activate((idx + 1) % steps.length), INTERVAL);
    };
    const stopAuto = () => {
      howGrid.classList.remove("how-auto");
      clearInterval(timer);
      timer = null;
      clearTimeout(resumeTimer);
    };
    steps.forEach((s, i) =>
      s.addEventListener("click", () => {
        stopAuto();
        activate(i);
        resumeTimer = setTimeout(startAuto, 14000); /* resume the demo after idle */
      })
    );
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([e]) => {
          inView = e.isIntersecting;
          if (inView) startAuto();
          else stopAuto();
        },
        { threshold: 0.2 }
      ).observe(howGrid);
    }
  }

  /* MCP terminal: type the command once when it scrolls into view */
  const term = document.getElementById("mcp-term");
  if (term && !reduceMotion && "IntersectionObserver" in window) {
    const finalHTML = term.innerHTML;
    const commandText = 'claude mcp add --transport http manather \\\n    http://127.0.0.1:4319/mcp \\\n    --header "Authorization: Bearer <your-token>"';
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const pre = term.closest("pre");
    if (pre) pre.style.minHeight = `${pre.offsetHeight}px`; /* no layout shift while typing */
    term.innerHTML = '<span class="term-prompt">$</span> <span class="term-cursor" aria-hidden="true"></span>';
    let started = false;
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting || started) return;
      started = true;
      io.disconnect();
      let n = 0;
      const tick = () => {
        n += 2 + Math.floor(Math.random() * 3);
        if (n < commandText.length) {
          term.innerHTML =
            '<span class="term-prompt">$</span> ' +
            esc(commandText.slice(0, n)) +
            '<span class="term-cursor" aria-hidden="true"></span>';
          setTimeout(tick, 24 + Math.random() * 40);
        } else {
          term.innerHTML =
            '<span class="term-prompt">$</span> ' +
            esc(commandText) +
            '<span class="term-cursor" aria-hidden="true"></span>';
          setTimeout(() => {
            term.innerHTML = finalHTML;
          }, 350);
        }
      };
      setTimeout(tick, 300);
    }, { threshold: 0.5 }).observe(term);
  }

  /* Context pack: format tabs swap the brief filename; files open previews */
  const PACK_FILES = {
    brief: (fmt) =>
      `<span class="dim"># ${fmt === "CONTEXT.md" ? "CONTEXT" : fmt.replace(".md", "")}.md (sample)</span>\n\n# Project context\n\nDark, native-feeling macOS app landing.\nStart from the references below.\n\n<span class="hl">## Skills</span>\n- skills/swift-macos.md\n\n<span class="hl">## MCP servers</span>\n- manather · http://127.0.0.1:4319/mcp\n\n<span class="hl">## Snippets</span>\n- snippets/MasonryLayout.swift`,
    manifest: () =>
      `<span class="dim">// manifest.json (sample)</span>\n{\n  "name": "my-project",\n  "format": "claude-code",\n  "assets": [\n    { "type": "image",\n      "file": "assets/moodboard-042.png",\n      "tags": ["dark", "grid"] },\n    { "type": "skill",\n      "file": "skills/swift-macos.md" }\n  ]\n}`,
    assets: () =>
      `<span class="dim"># assets/ (sample)</span>\n\nmoodboard-042.png      <span class="dim">1.2 MB</span>\nref-hero-dark.png      <span class="dim">840 KB</span>\npalette-teal.png       <span class="dim">96 KB</span>\ndemo-clip.mp4          <span class="dim">3.1 MB</span>\n\n<span class="dim">Copied as-is. Originals never move.</span>`,
    skills: () =>
      `<span class="dim"># skills/swift-macos.md (sample)</span>\n\n---\nname: swift-macos\ndescription: SwiftUI patterns for macOS\n---\n\nUse NavigationSplitView for sidebars.\nPrefer .ultraThinMaterial for panels.`,
    snippets: () =>
      `<span class="dim"># snippets/ (sample)</span>\n\nMasonryLayout.swift    <span class="dim">Swift</span>\nSpringMotion.swift     <span class="dim">Swift</span>\nhue-filter.ts          <span class="dim">TypeScript</span>\n\n<span class="dim">Each snippet keeps its native extension.</span>`,
  };
  const packPreview = document.getElementById("pack-preview");
  const packTabs = document.querySelectorAll(".tab[data-format]");
  const treeItems = document.querySelectorAll(".tree-item");
  const brief = document.querySelector(".tree-brief");
  let currentFormat = "CLAUDE.md";
  let currentFile = "brief";
  const renderPack = () => {
    if (packPreview) packPreview.innerHTML = PACK_FILES[currentFile](currentFormat);
  };
  packTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      packTabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-pressed", t === tab ? "true" : "false");
      });
      currentFormat = tab.dataset.format;
      if (brief) brief.textContent = currentFormat;
      renderPack();
    });
  });
  treeItems.forEach((item) => {
    item.addEventListener("click", () => {
      treeItems.forEach((t) => {
        t.classList.toggle("is-active", t === item);
        t.setAttribute("aria-pressed", t === item ? "true" : "false");
      });
      currentFile = item.dataset.file;
      renderPack();
    });
  });
  renderPack();

  /* Gallery tabs */
  const shots = {
    board: {
      src: "assets/board.webp",
      alt: "A Manather board: infinite canvas with images, notes, shapes, and arrows",
      caption: "Boards: an infinite canvas with pan, zoom, and PNG export.",
      chrome: true,
    },
    collections: {
      src: "assets/collections.webp",
      alt: "Manather collections: groups of assets shown as stacked cards",
      caption: "Collections: group assets together. One asset can live in several.",
      chrome: true,
    },
    detail: {
      src: "assets/detail.webp",
      alt: "The Manather detail view: full-screen asset with inspector and color palette",
      caption: "Detail view: a full-screen viewer with an inspector and a live color palette.",
      chrome: false,
    },
  };
  const shotImg = document.getElementById("gallery-shot");
  const shotCaption = document.getElementById("gallery-caption");
  const shotWindow = document.getElementById("gallery-window");
  const galleryTabs = document.querySelectorAll(".tab[data-shot]");
  let swapTimer = 0;
  let swapSeq = 0;
  galleryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const shot = shots[tab.dataset.shot];
      if (!shot || !shotImg) return;
      const mySeq = ++swapSeq;
      clearTimeout(swapTimer);
      galleryTabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-pressed", t === tab ? "true" : "false");
      });
      shotImg.classList.add("is-fading");
      const swap = () => {
        shotImg.src = shot.src;
        shotImg.alt = shot.alt;
        if (shotCaption) shotCaption.textContent = shot.caption;
        if (shotWindow) shotWindow.classList.toggle("window-bare", !shot.chrome);
        shotImg.decode().catch(() => {}).finally(() => {
          if (mySeq === swapSeq) shotImg.classList.remove("is-fading");
        });
      };
      reduceMotion ? swap() : (swapTimer = setTimeout(swap, 180));
    });
  });
  /* Warm the gallery images once the browser is idle */
  if (shotImg) {
    const warm = () => Object.values(shots).forEach(({ src }) => { new Image().src = src; });
    "requestIdleCallback" in window ? requestIdleCallback(warm, { timeout: 4000 }) : setTimeout(warm, 3000);
  }

  /* Live GitHub numbers; the static fallback text stays if anything fails */
  const REPO = "Manath-iq/Manather";
  const compact = (n) =>
    n >= 999500
      ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`
        : `${n}`;

  const countUp = (el, target) => {
    if (reduceMotion || target < 10) {
      el.textContent = compact(target);
      return;
    }
    const t0 = performance.now();
    const DUR = 900;
    const frame = (now) => {
      const p = Math.min((now - t0) / DUR, 1);
      el.textContent = compact(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const setStat = (name, value, label) => {
    document.querySelectorAll(`[data-stat="${name}"]`).forEach((el) => {
      if (typeof value === "number") {
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(([e], io) => {
            if (!e.isIntersecting) return;
            io.disconnect();
            countUp(el, value);
          }, { threshold: 0.5 }).observe(el);
        } else {
          countUp(el, value);
        }
      } else {
        el.textContent = value;
      }
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
        setStat("stars", repo.stargazers_count, "stars on GitHub");
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
      if (total > 0) setStat("downloads", total, "downloads");
    })
    .catch(() => {});
})();
