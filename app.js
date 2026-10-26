"use strict";
const list = document.querySelector("#games");
const status = document.querySelector("#status");
const player = document.querySelector("#player");
const slot = document.querySelector("#frame-slot");
let games = [];
let active = null;
let returnFocus = null;
let selectedWeek = 1;
const weekTabs = document.querySelector(".week-tabs");
for (const [index, button] of [...weekTabs.querySelectorAll("button")].entries()) {
  button.dataset.week = String(index + 1);
}
function weekLabel(week, heading = false) {
  return week === 1 ? `Week one ${heading ? "·" : "—"} Clicker games` : `Week ${week}`;
}
function renderWeeks() {
  const available = new Set(games.filter(g => g.week > 0).map(g => g.week));
  if (!available.has(selectedWeek) && available.size) selectedWeek = Math.min(...available);
  for (const week of [...available].sort((a, b) => a - b)) {
    if (!weekTabs.querySelector(`[data-week="${week}"]`)) {
      const button = text("button", weekLabel(week), "week-tab");
      button.type = "button";
      button.dataset.week = String(week);
      weekTabs.append(button);
    }
  }
  for (const button of weekTabs.querySelectorAll("button")) {
    const week = Number(button.dataset.week);
    button.disabled = !available.has(week);
    button.classList.toggle("active", week === selectedWeek);
    if (week === selectedWeek) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  document.querySelector("#games-title").textContent = weekLabel(selectedWeek, true);
}
function text(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value;
  if (className) el.className = className;
  return el;
}
function launch(game, button) {
  active = game;
  if (button) returnFocus = button;
  const frame = document.createElement("iframe");
  frame.title = game.title + " — game";
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.setAttribute("allow", "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; clipboard-read 'none'; clipboard-write 'none'");
  const source = new URL(game.path, document.baseURI);
  source.searchParams.set("build", game.sha256 || String(game.version || 1));
  frame.src = source.href;
  slot.replaceChildren(frame);
  document.querySelector("#player-title").textContent = game.title;
  player.hidden = false;
  player.scrollIntoView({behavior:"smooth",block:"start"});
  document.querySelector("#close").focus({preventScroll:true});
}
function render() {
  const query = document.querySelector("#search").value.toLowerCase().trim();
  renderWeeks();
  const weekGames = games.filter(g => g.week === selectedWeek);
  const shown = weekGames.filter(g => [g.title, ...g.tags].join(" ").toLowerCase().includes(query));
  list.replaceChildren();
  for (const game of shown) {
    const card = text("article", "", "card");
    const art = text("div", "◌•", "art");
    art.setAttribute("aria-hidden", "true");
    const body = text("div", "", "card-body");
    body.append(text("div", `${game.generator || "CLASS CREATION"} / V${game.version || 1}`, "meta"), text("h3", game.title), text("p", game.description));
    const tags = text("div", "", "tags");
    for (const tag of game.tags) tags.append(text("span", tag, "tag"));
    const button = text("button", "", "play");
    button.type = "button";
    button.append(text("span", "Play game"), text("span", "↗"));
    button.addEventListener("click", () => launch(game, button));
    body.append(tags, button);
    card.append(art, body);
    list.append(card);
  }
  status.textContent = shown.length ? `${shown.length} game${shown.length === 1 ? "" : "s"} · new releases appear automatically` : weekGames.length ? "No matching games. Try another title or tag." : "The new collection is being prepared. Games will appear here as they are published.";
}
document.querySelector("#search").addEventListener("input", render);
weekTabs.addEventListener("click", event => {
  const button = event.target.closest("button[data-week]");
  if (!button || button.disabled || !weekTabs.contains(button)) return;
  selectedWeek = Number(button.dataset.week);
  document.querySelector("#search").value = "";
  closePlayer(false);
  render();
});
document.querySelector("#restart").addEventListener("click", () => {if (active) launch(active);});
document.querySelector("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await player.requestFullscreen();
  } catch (_) { player.classList.toggle("expanded-player"); }
});
document.addEventListener("fullscreenchange", () => { document.querySelector("#fullscreen").textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen"; });
function closePlayer(restoreFocus = true) {
  if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  player.classList.remove("expanded-player");
  slot.replaceChildren();
  active = null;
  player.hidden = true;
  if (restoreFocus && returnFocus && returnFocus.isConnected) returnFocus.focus();
}
document.querySelector("#close").addEventListener("click", () => closePlayer());
async function refreshCatalog() {
  try {
    const response = await fetch("catalog.json?t=" + Date.now(), {credentials:"omit",cache:"no-store"});
    if (!response.ok) throw new Error("Catalog unavailable");
    const catalog = await response.json();
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.games)) throw new Error("Invalid catalog");
    const latest = new Map();
    for (const game of catalog.games) {
      if (typeof game.id !== "string" || !game.id.trim() || typeof game.title !== "string" ||
          !Array.isArray(game.tags) || !game.tags.every(tag => typeof tag === "string") ||
          !Number.isSafeInteger(game.week) || game.week < 0 ||
          !Number.isSafeInteger(game.version) || game.version < 1 ||
          !/^(?:(?:games|p)\/[a-z0-9-]+\/v[1-9][0-9]*\/(?:index\.html)?|game-[a-z0-9-]+\.html)$/.test(game.path)) continue;
      const previous = latest.get(game.id);
      if (!previous || game.version >= previous.version) latest.set(game.id, game);
    }
    games = [...latest.values()];
    render();
  } catch (_) { if (!games.length) status.textContent = "The collection is updating. Please check back shortly."; }
}
refreshCatalog();
setInterval(refreshCatalog, 30000);
