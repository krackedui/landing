// Motion port. Values come from reference/designsystems-surf/motion/:
// appear = opacity 0 + translateY(10px) → none on a 400ms spring (style.css),
// marquees = linear loops, hero = a typed word cycle with a blinking caret.

// appear-on-scroll, once (matches the whileInView/once behaviour)
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  },
  { rootMargin: "0px 0px -10% 0px" },
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  // small stagger for siblings that enter together
  el.style.transitionDelay = `${(i % 4) * 0.075}s`;
  io.observe(el);
});

// duplicate carousel cards so the -50% marquee loops seamlessly
const track = document.querySelector(".carousel__track");
if (track) track.append(...[...track.children].map((n) => n.cloneNode(true)));

// avatar marquee (placeholder gradient circles)
const avatars = document.querySelector(".avatars__track");
if (avatars) {
  const hues = [["#2469ff", "#8957ff"], ["#ff5400", "#ffb70f"], ["#6352fa", "#c8ed78"], ["#111", "#555"], ["#3b77ed", "#94f477"], ["#ff5a8a", "#ffd1e6"]];
  for (let i = 0; i < 48; i++) {
    const [c1, c2] = hues[i % hues.length];
    const dot = document.createElement("i");
    dot.style.setProperty("--c1", c1);
    dot.style.setProperty("--c2", c2);
    avatars.append(dot);
  }
}

// hero typed word cycle
const typed = document.querySelector(".typed");
if (typed) {
  const words = typed.dataset.words.split("|");
  let w = 0;
  let c = 0;
  let deleting = false;
  const tick = () => {
    const word = words[w];
    c += deleting ? -1 : 1;
    typed.textContent = word.slice(0, c);
    let delay = deleting ? 45 : 90;
    if (!deleting && c === word.length) { deleting = true; delay = 1800; }
    else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
    setTimeout(tick, delay);
  };
  tick();
}

// featured card: a cursor glides in from the image's bottom-right corner,
// clicks the input, and types a prompt whose @mention cycles through apps.
// each mention is bold white and glows briefly the moment it finishes typing.
const feature = document.querySelector(".feature");
const card = feature?.querySelector(".ai-card");
if (feature && card) {
  const cursor = feature.querySelector(".ai-cursor");
  const typed = card.querySelector(".ai-card__typed");
  const caret = card.querySelector(".ai-card__caret");
  const send = card.querySelector(".ai-card__send");
  const PREFIX = "I want the Design System from ";
  const MENTIONS = ["Raycast", "ClickUp", "Notion", "Figma"];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mention = (name) => {
    const m = document.createElement("span");
    m.className = "mention";
    m.textContent = name;
    return m;
  };

  if (reduced) {
    const m = mention(`@${MENTIONS[MENTIONS.length - 1]}`);
    m.classList.add("is-lit");
    typed.append(PREFIX, m);
  } else {
    // only animate while the card is on screen
    let visible = false;
    let wake = null;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && wake) { wake(); wake = null; }
    }, { threshold: 0.3 }).observe(card);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = async (ms) => {
      await sleep(ms);
      if (!visible) await new Promise((r) => (wake = r));
    };
    const jitter = () => 45 + Math.random() * 50;

    const placeCursor = (x, y) => {
      cursor.style.setProperty("--cx", `${x}px`);
      cursor.style.setProperty("--cy", `${y}px`);
    };
    const inputPoint = () => {
      const f = feature.getBoundingClientRect();
      const c = caret.getBoundingClientRect();
      // the arrow's tip sits ~4px in from the svg's top-left
      return [c.left - f.left - 2, c.top - f.top + c.height / 2 - 4];
    };

    const typeInto = async (node, text) => {
      card.classList.add("is-typing");
      for (const ch of text) {
        node.textContent += ch;
        await step(jitter());
      }
      card.classList.remove("is-typing");
    };
    const backspace = async (node) => {
      card.classList.add("is-typing");
      while (node.textContent.length) {
        node.textContent = node.textContent.slice(0, -1);
        await step(32);
      }
      card.classList.remove("is-typing");
    };

    const run = async () => {
      for (;;) {
        // reset: empty input, cursor parked at the bottom-right corner
        typed.textContent = "";
        typed.style.opacity = "";
        cursor.style.transition = "none";
        placeCursor(feature.clientWidth - 40, feature.clientHeight - 40);
        cursor.getBoundingClientRect();
        cursor.style.transition = "";
        await step(600);

        // glide to the input and click it
        cursor.classList.add("is-on");
        placeCursor(...inputPoint());
        await step(1150);
        cursor.classList.remove("is-click");
        void cursor.offsetWidth;
        cursor.classList.add("is-click");
        await step(320);
        // step the cursor aside so the text stays readable
        const [x, y] = inputPoint();
        placeCursor(x + 28, y + 22);
        cursor.classList.remove("is-on");

        const prefix = document.createTextNode("");
        typed.append(prefix);
        await typeInto(prefix, PREFIX);

        for (const [i, name] of MENTIONS.entries()) {
          const m = mention("");
          typed.append(m);
          await typeInto(m, `@${name}`);
          m.classList.add("is-lit");
          const last = i === MENTIONS.length - 1;
          await step(last ? 2400 : 1100);
          if (!last) {
            await backspace(m);
            m.remove();
            await step(220);
          }
        }

        // send, clear, and loop
        send.classList.add("is-pressed");
        await step(180);
        send.classList.remove("is-pressed");
        typed.style.transition = "opacity 0.35s ease";
        typed.style.opacity = "0";
        await step(1400);
        typed.style.transition = "";
      }
    };
    run();
  }
}
