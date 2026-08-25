const state = { tripId: null, trips: [] };

const $ = (sel) => document.querySelector(sel);

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `Request failed (${res.status})`);
  return data;
}

// --- trip list / creation --------------------------------------------------

async function loadTrips() {
  state.trips = await api("GET", "/trips");
  const list = $("#trip-list");
  if (state.trips.length === 0) {
    list.innerHTML = `<p class="empty">No trips yet — create one below.</p>`;
    return;
  }
  list.innerHTML = "";
  for (const trip of state.trips) {
    const el = document.createElement("div");
    el.className = "trip-item";
    el.innerHTML = `
      <div>
        <div class="name">${escapeHtml(trip.destination)}</div>
        <div class="meta">${trip.startDate} → ${trip.endDate} · ${trip.durationDays} day(s)</div>
      </div>
      <span>→</span>`;
    el.addEventListener("click", () => selectTrip(trip.id));
    list.appendChild(el);
  }
}

$("#trip-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const destination = form.get("destination");
  const startDate = form.get("startDate");
  const endDate = form.get("endDate");
  const durationDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86_400_000) + 1);
  const activities = String(form.get("activities") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const trip = await api("POST", "/trips", { destination, startDate, endDate, durationDays, activities });
  e.target.reset();
  await loadTrips();
  selectTrip(trip.id);
});

// --- trip view ---------------------------------------------------------

async function selectTrip(tripId) {
  state.tripId = tripId;
  const trip = await api("GET", `/trips/${tripId}`);
  $("#trip-picker").classList.add("hidden");
  $("#trip-view").classList.remove("hidden");
  $("#trip-title").textContent = trip.destination;
  $("#trip-meta").textContent =
    `${trip.startDate} → ${trip.endDate} · ${trip.durationDays} day(s)` +
    (trip.activities.length ? ` · ${trip.activities.join(", ")}` : "");
  $("#last-result").classList.add("hidden");
  $("#photo-input").value = "";
  await Promise.all([refreshInventory(), refreshReview()]);
}

$("#change-trip").addEventListener("click", () => {
  $("#trip-view").classList.add("hidden");
  $("#trip-picker").classList.remove("hidden");
  state.tripId = null;
});

// --- photo upload --------------------------------------------------------

$("#photo-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !state.tripId) return;

  const statusEl = $("#upload-status");
  statusEl.textContent = "Analysing photo…";
  try {
    const form = new FormData();
    form.append("photo", file);
    const result = await api("POST", `/trips/${state.tripId}/photos`, form);
    statusEl.textContent = "";
    showLastResult(result);
    await Promise.all([refreshInventory(), refreshReview()]);
  } catch (err) {
    statusEl.textContent = `Failed: ${err.message}`;
  } finally {
    e.target.value = "";
  }
});

function showLastResult(result) {
  const el = $("#last-result");
  el.classList.remove("hidden");
  el.innerHTML = `
    <strong>Photo processed.</strong>
    <div class="badges">
      <span class="badge matched">${result.matchedCount} already packed (matched)</span>
      <span class="badge added">${result.addedCount} new</span>
      ${result.ambiguousCount > 0 ? `<span class="badge ambiguous">${result.ambiguousCount} need review</span>` : ""}
    </div>`;
}

// --- inventory ------------------------------------------------------------

async function refreshInventory() {
  const items = await api("GET", `/trips/${state.tripId}/inventory`);
  $("#inventory-count").textContent = items.length;
  const list = $("#inventory-list");
  if (items.length === 0) {
    list.innerHTML = `<p class="empty">Nothing packed yet. Upload a photo or add an item manually.</p>`;
    return;
  }
  list.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="info">
        <span>${escapeHtml(item.name)} ${item.source === "manual" ? "✏️" : ""}</span>
        <span class="cat">${item.category ? escapeHtml(item.category) : "uncategorized"}</span>
      </div>
      <span class="qty">×${item.quantity}</span>
      <div class="actions">
        <button data-action="minus">−</button>
        <button data-action="plus">+</button>
        <button data-action="remove" class="remove">Remove</button>
      </div>`;
    row.querySelector('[data-action="plus"]').addEventListener("click", () =>
      updateQuantity(item.id, item.quantity + 1),
    );
    row.querySelector('[data-action="minus"]').addEventListener("click", () =>
      updateQuantity(item.id, Math.max(1, item.quantity - 1)),
    );
    row.querySelector('[data-action="remove"]').addEventListener("click", () => removeItem(item.id));
    list.appendChild(row);
  }
}

async function updateQuantity(itemId, quantity) {
  await api("PATCH", `/trips/${state.tripId}/inventory/${itemId}`, { quantity });
  await refreshInventory();
}

async function removeItem(itemId) {
  await api("DELETE", `/trips/${state.tripId}/inventory/${itemId}`);
  await refreshInventory();
}

$("#add-item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  await api("POST", `/trips/${state.tripId}/inventory`, {
    name: form.get("name"),
    category: form.get("category") || null,
    quantity: Number(form.get("quantity")) || 1,
  });
  e.target.reset();
  await refreshInventory();
});

// --- review queue -----------------------------------------------------

async function refreshReview() {
  const [candidates, inventory] = await Promise.all([
    api("GET", `/trips/${state.tripId}/review`),
    api("GET", `/trips/${state.tripId}/inventory`),
  ]);
  $("#review-count").textContent = candidates.length;
  const list = $("#review-list");
  if (candidates.length === 0) {
    list.innerHTML = `<p class="empty">Nothing waiting on you right now.</p>`;
    return;
  }
  list.innerHTML = "";
  for (const c of candidates) {
    const row = document.createElement("div");
    row.className = "review-row";
    const candidateItems = inventory.filter((i) => c.candidateItemIds.includes(i.id));
    row.innerHTML = `
      <div><strong>${escapeHtml(c.detectedName)}</strong> ${c.detectedCategory ? `(${escapeHtml(c.detectedCategory)})` : ""}</div>
      <div class="cat">Not sure if this is a repeat or a new item.</div>
      <div class="actions">
        ${
          candidateItems.length > 0
            ? `<select>${candidateItems.map((i) => `<option value="${i.id}">Same as: ${escapeHtml(i.name)}</option>`).join("")}</select>
               <button data-action="match">Confirm match</button>`
            : ""
        }
        <button data-action="new">It's new</button>
        <button data-action="discard">Discard</button>
      </div>`;

    const select = row.querySelector("select");
    if (select) {
      row.querySelector('[data-action="match"]').addEventListener("click", () =>
        resolveReview(c.id, { action: "confirm_match", itemId: select.value }),
      );
    }
    row.querySelector('[data-action="new"]').addEventListener("click", () =>
      resolveReview(c.id, { action: "confirm_new" }),
    );
    row.querySelector('[data-action="discard"]').addEventListener("click", () =>
      resolveReview(c.id, { action: "discard" }),
    );
    list.appendChild(row);
  }
}

async function resolveReview(candidateId, resolution) {
  await api("POST", `/review/${candidateId}/resolve`, resolution);
  await Promise.all([refreshInventory(), refreshReview()]);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

loadTrips();
