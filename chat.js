// "Ask about my work" chat: a floating button that opens a small chat panel.
// Questions go to the Cloudflare Worker in chatbot-worker/, which asks Gemini and keeps the API key secret.
(() => {
  // Paste the Worker's URL here after deploying it (see chatbot-worker/README.md)
  const CHAT_ENDPOINT = "https://portfolio-chat.sudhakar-g-5796.workers.dev";
  const EMAIL = "sudhakar.g.5796@gmail.com";
  const STORE = "portfolio-chat";
  // One picture per mood in assets/chat/ (the Worker picks the mood for each answer)
  const MOODS = ["happy", "excited", "proud", "thinking", "laughing", "curious", "sorry", "waving"];
  const face = (mood) => `assets/chat/${mood}.webp?v=2`;
  const STARTERS = [
    "What kind of designer are you?",
    "Which game should I play first?",
    "Which of your games used AI?",
    "What did you do before game design?",
  ];
  const FALLBACK = `I can't chat right now, sorry! You can email me at ${EMAIL}.`;
  const ERRORS = {
    region: `This AI chat isn't available in your region, but you can email me at ${EMAIL}.`,
    rate: "That's a lot of questions at once! Give me a minute and try again.",
    daily: `You've asked me a lot today! For anything else, email me at ${EMAIL}.`,
    busy: `I've talked so much today that I've hit my limit. Try again later, or email me at ${EMAIL}.`,
    no_answer: `I couldn't answer that one. Try asking another way, or email me at ${EMAIL}.`,
  };

  // The conversation lasts for this browser tab, across pages
  let messages = [];
  try { messages = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch { /* storage blocked */ }
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-20))); } catch { /* storage blocked */ } };

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "chat-launcher";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "chat-panel");
  launcher.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"/></svg><span class="chat-launcher-text">Ask about my work</span><img class="chat-launcher-face" alt="" width="68" height="68">';

  const panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.id = "chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Chat with an AI version of Sudhakar");
  panel.innerHTML = `
    <header class="chat-head">
      <div class="chat-stage" aria-hidden="true">
        <img class="chat-face" alt="" width="168" height="168">
      </div>
      <div class="chat-head-text">
        <p class="chat-title">Hi, I'm Sudhakar</p>
        <p class="chat-sub">Well, an AI version of me. Ask about my work!</p>
      </div>
      <button type="button" class="chat-close" aria-label="Close chat">&times;</button>
    </header>
    <div class="chat-log" aria-live="polite"></div>
    <div class="chat-starters"></div>
    <form class="chat-form">
      <input type="text" name="q" maxlength="500" autocomplete="off" placeholder="Ask a question…" aria-label="Your question">
      <button type="submit" aria-label="Send">&#10148;</button>
    </form>
    <p class="chat-note">This is an AI (Google's Gemini), not the real me, and it can be wrong. Please don't share personal details.</p>`;

  document.body.append(launcher, panel);
  const log = panel.querySelector(".chat-log");
  const starters = panel.querySelector(".chat-starters");
  const form = panel.querySelector(".chat-form");
  const input = form.elements.q;
  const send = form.querySelector("button");
  const headFace = panel.querySelector(".chat-face");
  let busy = false;

  // The pictures are optional: until they load, the chat is text only
  const probe = new Image();
  probe.onload = () => {
    panel.classList.add("has-faces");
    launcher.querySelector(".chat-launcher-face").src = face("waving");
    launcher.classList.add("has-face");
    MOODS.forEach((m) => { new Image().src = face(m); });
  };
  probe.src = face("waving");

  // Shows a mood on the big picture, with a little bob as if speaking
  function setMood(mood, speak) {
    if (!MOODS.includes(mood)) mood = "happy";
    headFace.src = face(mood);
    if (speak) {
      headFace.classList.remove("speak");
      void headFace.offsetWidth; // restart the animation
      headFace.classList.add("speak");
    }
  }

  // Escape the text, then turn URLs, project pages and the email address into links
  function linkify(text) {
    const esc = text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    return esc.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\b[a-z0-9-]+\.html\b/g, (m) => {
      if (m.includes("@")) return `<a href="mailto:${m}">${m}</a>`;
      if (m.startsWith("http")) return `<a href="${m}" target="_blank" rel="noopener">${m}</a>`;
      return `<a href="${m}">${m}</a>`;
    });
  }

  function bubble(role, text, mood) {
    const el = document.createElement("p");
    el.className = `chat-msg chat-${role}`;
    if (role === "assistant") {
      el.innerHTML = linkify(text);
      setMood(mood);
    } else {
      el.textContent = text;
    }
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function render() {
    log.textContent = "";
    bubble("assistant", "Hey there! Ask me anything about my games, how I design, or what I did before game design.", "waving");
    messages.forEach((m) => bubble(m.role, m.text, m.mood));
    starters.hidden = messages.length > 0;
  }

  STARTERS.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = q;
    b.addEventListener("click", () => ask(q));
    starters.append(b);
  });

  async function ask(question) {
    question = question.trim();
    if (!question || busy) return;
    busy = true;
    send.disabled = true;
    starters.hidden = true;
    messages.push({ role: "user", text: question });
    save();
    bubble("user", question);
    const pending = bubble("assistant", "Thinking…", "thinking");
    pending.classList.add("chat-pending");

    let answer = FALLBACK;
    let mood = "sorry";
    let ok = false;
    if (CHAT_ENDPOINT) {
      try {
        const res = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messages.slice(-10) }),
        });
        const data = await res.json();
        if (data.reply) { answer = data.reply; mood = data.mood; ok = true; }
        else answer = ERRORS[data.error] || FALLBACK;
      } catch { /* network error: keep the fallback */ }
    }

    pending.classList.remove("chat-pending");
    pending.innerHTML = linkify(answer);
    setMood(mood, true);
    // Only real answers join the history, so an error doesn't confuse the next question
    if (ok) messages.push({ role: "assistant", text: answer, mood });
    else messages.pop();
    save();
    log.scrollTop = log.scrollHeight;
    busy = false;
    send.disabled = false;
  }

  function toggle(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.classList.toggle("is-open", open);
    if (open) {
      if (!log.childElementCount) render();
      input.focus();
    } else {
      launcher.focus();
    }
  }

  launcher.addEventListener("click", () => toggle(panel.hidden));
  panel.querySelector(".chat-close").addEventListener("click", () => toggle(false));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = "";
    ask(q);
  });
})();
