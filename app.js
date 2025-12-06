// Warehouse local DB
const warehouseDB = {
  inventory: [], // {id, name, category, cost, qty, location, stockLimit?}
  movements: [], // {type: 'inbound'|'outbound'|'adjustment', id, name, qty, cost?, location?, reason?, date}
  admins: [{ username: "admin", password: "admin123" }]
};

// Persist
function loadWarehouseDB() {
  const data = localStorage.getItem("warehouseDB");
  if (data) Object.assign(warehouseDB, JSON.parse(data));
}
function saveWarehouseDB() {
  localStorage.setItem("warehouseDB", JSON.stringify(warehouseDB));
}

// Auth
function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  // Example: simple admin check
  const valid = warehouseDB.admins.some(admin => 
    admin.username === username && admin.password === password
  );

  if (!valid) {
    alert("Invalid login credentials");
    return;
  }

  // Hide login, show main app
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");

  // Show current user
  document.getElementById("currentUser").textContent = username;

  // Render dashboard data
  renderAll();
}


function logout() {
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
}

// Navigation
function showSection(id, e) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (e) e.target.classList.add("active");
}

// Inventory CRUD
function showAddProductModal() { document.getElementById("productModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function saveProduct() {
  const id = document.getElementById("productId").value.trim();
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const cost = parseFloat(document.getElementById("costPrice").value || "0");
  const qty = parseInt(document.getElementById("initialStock").value || "0", 10);
  const location = document.getElementById("productLocation").value.trim();
  if (!id || !name) return alert("SKU and Product Name required");

  const existing = warehouseDB.inventory.find(p => p.id === id);
  if (existing) {
    existing.name = name; existing.category = category; existing.cost = cost; existing.qty = qty; existing.location = location;
  } else {
    warehouseDB.inventory.push({ id, name, category, cost, qty, location });
  }
  saveWarehouseDB();
  closeModal("productModal");
  renderInventory();
  renderCounts();
}

// Receiving
function addInbound() {
  const id = document.getElementById("inProductId").value.trim();
  const name = document.getElementById("inProductName").value.trim();
  const category = document.getElementById("inCategory").value.trim();
  const qty = parseInt(document.getElementById("inQty").value || "0", 10);
  const cost = parseFloat(document.getElementById("inCost").value || "0");
  const location = document.getElementById("inLocation").value.trim();

  if (!id || !name || qty <= 0) {
    alert("SKU, product name, and positive quantity are required.");
    return;
  }

  let item = warehouseDB.inventory.find(p => p.id === id);
  if (!item) {
    item = { id, name, category, cost, qty: 0, location };
    warehouseDB.inventory.push(item);
  }

  item.qty += qty;
  item.cost = cost || item.cost;
  item.location = location || item.location;
  item.category = category || item.category;

  warehouseDB.movements.push({
    type: "inbound",
    id,
    name,
    qty,
    cost,
    location,
    category,
    date: new Date().toLocaleString()
  });

  saveWarehouseDB();
  renderInventory();
  renderInbound();
  renderCounts();
}


// Dispatch
function addOutbound() {
  const id = document.getElementById("outProductId").value.trim();
  const qty = parseInt(document.getElementById("outQty").value || "0", 10);
  const dest = document.getElementById("outDestination").value.trim();
  const item = warehouseDB.inventory.find(p => p.id === id);
  if (!item) return alert("SKU not found");
  if (qty <= 0) return alert("Positive qty required");
  if (item.qty < qty) return alert("Not enough stock");

  item.qty -= qty;
  warehouseDB.movements.push({ type: "outbound", id, name: item.name, qty, destination: dest, date: new Date().toLocaleString() });
  saveWarehouseDB();
  renderOutbound();
  renderInventory();
  renderCounts();
  renderMovementsChart();
}

// Adjustments
function applyAdjustment() {
  const id = document.getElementById("adjustProductId").value.trim();
  const qtyChange = parseInt(document.getElementById("adjustQtyChange").value || "0", 10);
  const reason = document.getElementById("adjustReason").value.trim();

  if (!id || qtyChange === 0 || !reason) {
    alert("SKU, non-zero quantity change, and reason are required.");
    return;
  }

  const item = warehouseDB.inventory.find(p => p.id === id);
  if (!item) {
    alert("Product not found in inventory.");
    return;
  }

  item.qty += qtyChange;

  warehouseDB.movements.push({
    type: "adjustment",
    id,
    name: item.name,
    qty: qtyChange,
    reason,
    date: new Date().toLocaleString()
  });

  saveWarehouseDB();
  renderInventory();
  renderAdjustments();
  renderCounts();

  alert("Adjustment applied successfully!");
}


// Rendering
function renderInventory() {
  const body = document.getElementById("inventoryTableBody");
  body.innerHTML = "";
  warehouseDB.inventory.forEach(p => {
    const status = p.qty <= 0 ? "Out of stock" : (p.qty < 10 ? "Low" : "OK");
    body.innerHTML += `<tr>
  <td>${p.id}</td>
  <td>${p.name}</td>
  <td>${p.category || "-"}</td>
  <td>GH₵ ${Number(p.cost || 0).toFixed(2)}</td>
  <td>${p.qty}</td>
  <td>${p.location || "-"}</td>
  <td>${status}</td>
  <td>
    <button class="btn btn-secondary" onclick="editProduct('${p.id}')">Edit</button>
    <button class="btn btn-danger" onclick="confirmDeleteProduct('${p.id}')">Delete</button>
  </td>
</tr>`;

  });
  renderCounts();
}
function editProduct(id) {
  const p = warehouseDB.inventory.find(x => x.id === id);
  if (!p) return;
  document.getElementById("productModalTitle").textContent = "Edit Product";
  document.getElementById("productId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productCategory").value = p.category || "";
  document.getElementById("costPrice").value = p.cost || 0;
  document.getElementById("initialStock").value = p.qty || 0;
  document.getElementById("productLocation").value = p.location || "";
  document.getElementById("productModal").classList.remove("hidden");
}
function filterInventory() {
  const q = document.getElementById("inventorySearch").value.toLowerCase();
  const body = document.getElementById("inventoryTableBody");
  body.querySelectorAll("tr").forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? "" : "none";
  });
}

function renderInbound() {
  const body = document.getElementById("inboundTableBody");
  body.innerHTML = "";
  warehouseDB.movements.filter(m => m.type === "inbound").slice(-50).reverse().forEach(m => {
    body.innerHTML += `<tr><td>${m.date}</td><td>${m.id}</td><td>${m.name}</td><td>${m.qty}</td><td>GH₵ ${Number(m.cost || 0).toFixed(2)}</td><td>${m.location || "-"}</td></tr>`;
  });
}
function renderOutbound() {
  const body = document.getElementById("outboundTableBody");
  body.innerHTML = "";
  warehouseDB.movements.filter(m => m.type === "outbound").slice(-50).reverse().forEach(m => {
    body.innerHTML += `<tr><td>${m.date}</td><td>${m.id}</td><td>${m.name}</td><td>${m.qty}</td><td>${m.destination || "-"}</td></tr>`;
  });
}
function renderAdjustments() {
  const body = document.getElementById("adjustmentsTableBody");
  body.innerHTML = "";
  warehouseDB.movements.filter(m => m.type === "adjustment").slice(-50).reverse().forEach(m => {
    body.innerHTML += `<tr><td>${m.date}</td><td>${m.id}</td><td>${m.qty}</td><td>${m.reason}</td></tr>`;
  });
}

function renderCounts() {
  const totalSkus = warehouseDB.inventory.length;
  const totalStock = warehouseDB.inventory.reduce((s, p) => s + (p.qty || 0), 0);
  document.getElementById("totalSkus").textContent = totalSkus;
  document.getElementById("totalStock").textContent = totalStock;

  const todayKey = new Date().toISOString().split("T")[0];
  const todayInbound = warehouseDB.movements.filter(m => m.type === "inbound" && new Date(m.date).toISOString().split("T")[0] === todayKey)
    .reduce((s, m) => s + m.qty, 0);
  const todayOutbound = warehouseDB.movements.filter(m => m.type === "outbound" && new Date(m.date).toISOString().split("T")[0] === todayKey)
    .reduce((s, m) => s + m.qty, 0);

  document.getElementById("todayInbound").textContent = todayInbound;
  document.getElementById("todayOutbound").textContent = todayOutbound;

  // DB counts
  document.getElementById("dbProductCount").textContent = warehouseDB.inventory.length;
  document.getElementById("dbMovementsCount").textContent = warehouseDB.movements.length;
}

// Reports: chart and summary
let stockChart;
function renderMovementsChart() {
  const labels = [];
  const inboundData = [];
  const outboundData = [];
  const summaryBody = document.getElementById("movementSummaryBody");
  summaryBody.innerHTML = "";

  // Last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    labels.push(key);

    const inbound = warehouseDB.movements.filter(m => m.type === "inbound" && new Date(m.date).toISOString().split("T")[0] === key)
      .reduce((s, m) => s + m.qty, 0);
    const outbound = warehouseDB.movements.filter(m => m.type === "outbound" && new Date(m.date).toISOString().split("T")[0] === key)
      .reduce((s, m) => s + m.qty, 0);

    inboundData.push(inbound);
    outboundData.push(outbound);

    const net = inbound - outbound;
    summaryBody.innerHTML += `<tr><td>${key}</td><td>${inbound}</td><td>${outbound}</td><td>${net}</td></tr>`;
  }

  const canvas = document.getElementById("stockMovementsChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (stockChart) stockChart.destroy();

  stockChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Inbound Qty", data: inboundData, borderColor: "#3182ce", backgroundColor: "rgba(49,130,206,0.2)", tension: 0.3 },
        { label: "Outbound Qty", data: outboundData, borderColor: "#e53e3e", backgroundColor: "rgba(229,62,62,0.2)", tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Units" } },
        x: { title: { display: true, text: "Date" } }
      }
    }
  });
}

// Export/Import/Clear
function exportWarehouseDB() {
  const blob = new Blob([JSON.stringify(warehouseDB, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "warehouseDB.json"; a.click();
  URL.revokeObjectURL(url);
}
async function importWarehouseDB() {
  const file = document.getElementById("importFile").files[0];
  if (!file) return alert("Choose a JSON file");
  const text = await file.text();
  const data = JSON.parse(text);
  Object.assign(warehouseDB, data);
  saveWarehouseDB();
  renderAll();
}
function clearWarehouseData() {
  if (!confirm("This will clear all warehouse data. Continue?")) return;
  warehouseDB.inventory = [];
  warehouseDB.movements = [];
  saveWarehouseDB();
  renderAll();
}

function autoGenerateSKU() {
  const name = document.getElementById("inProductName").value.trim();
  if (!name) {
    document.getElementById("inProductId").value = "";
    return;
  }

  const prefix = name.slice(0, 3).toUpperCase(); // First 3 letters
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
  const sku = `${prefix}${timestamp}`; // e.g. CIN8421

  document.getElementById("inProductId").value = sku;
}

function searchProductByName() {
  const query = document.getElementById("productSearchInput").value.toLowerCase();
  if (!query) return;

  const match = warehouseDB.inventory.find(p => p.name.toLowerCase().includes(query));
  if (!match) return;

  // Auto-fill inbound fields
  if (document.getElementById("inProductName")) {
    document.getElementById("inProductName").value = match.name;
    document.getElementById("inProductId").value = match.id;
    document.getElementById("inCategory").value = match.category || "";
    document.getElementById("inLocation").value = match.location || "";
    document.getElementById("inCost").value = match.cost || 0;
  }

  // Auto-fill outbound fields
  if (document.getElementById("outProductSelect")) {
    document.getElementById("outProductSelect").value = match.id;
    document.getElementById("outProductId").value = match.id;
  }
}

function autoFillProductDetails() {
  const query = document.getElementById("productSearchInput").value.toLowerCase();
  if (!query) {
    document.getElementById("outProductId").value = "";
    return;
  }

  const match = warehouseDB.inventory.find(p => p.name.toLowerCase().includes(query));
  if (!match) return;

  document.getElementById("outProductId").value = match.id;

  // Optional: auto-fill other fields
  if (document.getElementById("outLocation")) {
    document.getElementById("outLocation").value = match.location || "";
  }
  if (document.getElementById("outCategory")) {
    document.getElementById("outCategory").value = match.category || "";
  }
}

function confirmAddInbound() {
  const confirmed = confirm("Are you sure you want to add this inbound entry?");
  if (confirmed) {
    addInbound(); // this is your original save function
  }
}

function confirmDeleteProduct(id) {
  const confirmed = confirm("Are you sure you want to delete this product?");
  if (!confirmed) return;

  warehouseDB.inventory = warehouseDB.inventory.filter(p => p.id !== id);

  // Optionally remove related movements
  warehouseDB.movements = warehouseDB.movements.filter(m => m.id !== id);

  saveWarehouseDB();
  renderInventory();
  renderCounts();
  renderInbound();
  renderOutbound();
  renderAdjustments();
}

function autoFillInboundSKU() {
  const query = document.getElementById("inProductSearch").value.toLowerCase();
  if (!query) {
    document.getElementById("inProductId").value = "";
    return;
  }

  const match = warehouseDB.inventory.find(p => p.name.toLowerCase().includes(query));
  if (match) {
    document.getElementById("inProductId").value = match.id;
    document.getElementById("inProductName").value = match.name;
    document.getElementById("inCategory").value = match.category || "";
    document.getElementById("inLocation").value = match.location || "";
    document.getElementById("inCost").value = match.cost || 0;
  } else {
    document.getElementById("inProductId").value = ""; // new product
  }
}

function autoFillInboundSKU() {
  const query = document.getElementById("inProductSearch").value.toLowerCase();
  if (!query) {
    document.getElementById("inProductId").value = "";
    return;
  }

  const match = warehouseDB.inventory.find(p => p.name.toLowerCase().includes(query));
  if (match) {
    document.getElementById("inProductId").value = match.id;
    document.getElementById("inProductName").value = match.name;
    document.getElementById("inCategory").value = match.category || "";
    document.getElementById("inLocation").value = match.location || "";
    document.getElementById("inCost").value = match.cost || 0;
  } else {
    document.getElementById("inProductId").value = ""; // new product
  }
}

function autoFillOrGenerateSKU() {
  const query = document.getElementById("inProductSearch").value.trim().toLowerCase();
  if (!query) {
    document.getElementById("inProductId").value = "";
    return;
  }

  const match = warehouseDB.inventory.find(p => p.name.toLowerCase() === query);
  if (match) {
    // Existing product — reuse SKU
    document.getElementById("inProductId").value = match.id;
    document.getElementById("inProductName").value = match.name;
    document.getElementById("inCategory").value = match.category || "";
    document.getElementById("inLocation").value = match.location || "";
    document.getElementById("inCost").value = match.cost || 0;
  } else {
    // New product — generate SKU
    const prefix = query.slice(0, 3).toUpperCase(); // e.g. RIC
    const timestamp = Date.now().toString().slice(-4); // e.g. 6311
    const newSKU = `${prefix}${timestamp}`; // e.g. RIC6311

    document.getElementById("inProductId").value = newSKU;
    document.getElementById("inProductName").value = query;
    document.getElementById("inCategory").value = "";
    document.getElementById("inLocation").value = "";
    document.getElementById("inCost").value = 0;
  }
}

function autoFillAdjustmentDetails() {
  const query = document.getElementById("adjustProductSearch").value.toLowerCase();
  if (!query) {
    document.getElementById("adjustProductId").value = "";
    return;
  }

  const match = warehouseDB.inventory.find(p => p.name.toLowerCase().includes(query));
  if (!match) {
    console.log("No match found for:", query);
    return;
  }

  // Auto-fill SKU
  document.getElementById("adjustProductId").value = match.id;

  // Optional: auto-fill other fields if they exist
  if (document.getElementById("adjustCategory")) {
    document.getElementById("adjustCategory").value = match.category || "";
  }
  if (document.getElementById("adjustLocation")) {
    document.getElementById("adjustLocation").value = match.location || "";
  }
  if (document.getElementById("adjustCost")) {
    document.getElementById("adjustCost").value = match.cost || 0;
  }
  if (document.getElementById("adjustQty")) {
    document.getElementById("adjustQty").value = match.qty || 0;
  }
}

function applyAdjustment() {
  const id = document.getElementById("adjustProductId").value.trim();
  const qtyChange = parseInt(document.getElementById("adjustQtyChange").value || "0", 10);
  const reason = document.getElementById("adjustReason").value.trim();

  if (!id || qtyChange === 0 || !reason) {
    alert("SKU, non-zero quantity change, and reason are required.");
    return;
  }

  const item = warehouseDB.inventory.find(p => p.id === id);
  if (!item) {
    alert("Product not found in inventory.");
    return;
  }

  item.qty += qtyChange;

  warehouseDB.movements.push({
    type: "adjustment",
    id,
    name: item.name,
    qty: qtyChange,
    reason,
    date: new Date().toLocaleString()
  });

  saveWarehouseDB();
  renderInventory();
  renderAdjustments();
  renderCounts();
}

// Init
function renderAll() {
  renderInventory();
  renderInbound();
  renderOutbound();
  renderAdjustments();
  renderCounts();
  renderMovementsChart();
}
loadWarehouseDB();
