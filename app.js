"use strict";
const list = document.querySelector("#games");
const status = document.querySelector("#status");
const player = document.querySelector("#player");
const slot = document.querySelector("#frame-slot");
let games = [];
let active = null;
let returnFocus = null;
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
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.setAttribute("allow", "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; clipboard-read 'none'; clipboard-write 'none'");
  frame.src = game.path;
  slot.replaceChildren(frame);
  document.querySelector("#player-title").textContent = game.title;
  player.hidden = false;
  player.scrollIntoView({behavior:"smooth",block:"start"});
  document.querySelector("#close").focus({preventScroll:true});
}
function render() {
  const query = document.querySelector("#search").value.toLowerCase().trim();
  const shown = games.filter(g => [g.title, ...g.tags].join(" ").toLowerCase().includes(query));
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
  status.textContent = shown.length ? `${shown.length} game${shown.length === 1 ? "" : "s"} · new releases appear automatically` : games.length ? "No matching games. Try another title or tag." : "The new collection is being prepared. Games will appear here as they are published.";
}
document.querySelector("#search").addEventListener("input", render);
document.querySelector("#restart").addEventListener("click", () => {if (active) launch(active);});
document.querySelector("#close").addEventListener("click", () => {
  slot.replaceChildren();
  active = null;
  player.hidden = true;
  if (returnFocus && returnFocus.isConnected) returnFocus.focus();
});
async function refreshCatalog() {
  try {
    const response = await fetch("catalog.json?t=" + Date.now(), {credentials:"omit",cache:"no-store"});
    if (!response.ok) throw new Error("Catalog unavailable");
    const catalog = await response.json();
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.games)) throw new Error("Invalid catalog");
    games = catalog.games.filter(g => typeof g.title === "string" && Array.isArray(g.tags) && /^(?:games|p)\/[a-z0-9-]+\/v[1-9][0-9]*\/(?:index\.html)?$/.test(g.path));
    render();
  } catch (_) { if (!games.length) status.textContent = "The collection is updating. Please check back shortly."; }
}
refreshCatalog();
setInterval(refreshCatalog, 30000);
