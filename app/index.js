const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory inventory store
let inventory = [
  { id: 1, name: 'Ordinateur portable', quantity: 15, price: 850000, category: 'Informatique' },
  { id: 2, name: 'Smartphone', quantity: 30, price: 320000, category: 'Téléphonie' },
  { id: 3, name: 'Imprimante', quantity: 8,  price: 125000, category: 'Informatique' },
  { id: 4, name: 'Écran 24"', quantity: 20, price: 95000,  category: 'Informatique' },
  { id: 5, name: 'Clavier sans fil', quantity: 50, price: 18000, category: 'Accessoires' },
];
let nextId = 6;

// Serve HTML UI
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechLogix – Inventory App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    header { background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px 40px; display: flex; align-items: center; gap: 15px; }
    header h1 { font-size: 1.6rem; font-weight: 700; color: #fff; }
    header .badge { background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; }
    .container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-card .value { font-size: 2rem; font-weight: 700; color: #60a5fa; }
    .stat-card .label { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .card h2 { font-size: 1.1rem; color: #93c5fd; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px 14px; font-size: 0.75rem; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #334155; }
    td { padding: 12px 14px; border-bottom: 1px solid #1e293b; font-size: 0.9rem; }
    tr:hover td { background: #0f172a; }
    .badge-cat { background: #1d4ed8; color: #bfdbfe; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; }
    .qty { font-weight: 600; color: #34d399; }
    form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    input, select { background: #0f172a; border: 1px solid #334155; color: #e2e8f0; padding: 10px 14px; border-radius: 8px; font-size: 0.9rem; width: 100%; }
    input:focus, select:focus { outline: none; border-color: #3b82f6; }
    button { background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; border: none; padding: 11px 24px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; grid-column: 1/-1; transition: opacity .2s; }
    button:hover { opacity: .85; }
    .footer { text-align: center; color: #475569; font-size: 0.78rem; margin-top: 40px; padding-bottom: 20px; }
    .env-info { background: #0f172a; border: 1px solid #1e40af; border-radius: 8px; padding: 10px 16px; font-size: 0.78rem; color: #60a5fa; margin-bottom: 20px; }
  </style>
</head>
<body>
<header>
  <div>
    <h1>📦 TechLogix – Inventory App</h1>
  </div>
  <span class="badge">Cloud-Native v1.0</span>
</header>
<div class="container">
  <div class="env-info">
    🚀 Déployé sur <strong>Kubernetes</strong> | Node: <strong>${process.env.NODE_NAME || 'N/A'}</strong> | Pod: <strong>${process.env.POD_NAME || process.env.HOSTNAME || 'N/A'}</strong>
  </div>
  <div class="stats" id="stats"></div>
  <div class="card">
    <h2>➕ Ajouter un article</h2>
    <form id="addForm">
      <input type="text" id="name" placeholder="Nom de l'article" required />
      <input type="number" id="quantity" placeholder="Quantité" required min="0" />
      <input type="number" id="price" placeholder="Prix (FCFA)" required min="0" />
      <select id="category">
        <option>Informatique</option>
        <option>Téléphonie</option>
        <option>Accessoires</option>
        <option>Bureau</option>
        <option>Réseau</option>
      </select>
      <button type="submit">Ajouter au stock</button>
    </form>
  </div>
  <div class="card">
    <h2>📋 Stock actuel</h2>
    <table>
      <thead><tr><th>ID</th><th>Article</th><th>Catégorie</th><th>Qté</th><th>Prix unitaire</th></tr></thead>
      <tbody id="inventoryBody"></tbody>
    </table>
  </div>
  <div class="footer">TechLogix © 2026 — Cloud-Native App Delivery TP | Kubernetes + Docker + GitHub Actions</div>
</div>
<script>
  async function loadData() {
    const res = await fetch('/api/inventory');
    const items = await res.json();
    document.getElementById('inventoryBody').innerHTML = items.map(i =>
      '<tr><td>' + i.id + '</td><td><strong>' + i.name + '</strong></td>' +
      '<td><span class="badge-cat">' + i.category + '</span></td>' +
      '<td class="qty">' + i.quantity + '</td>' +
      '<td>' + i.price.toLocaleString('fr-FR') + ' FCFA</td></tr>'
    ).join('');
    const total = items.reduce((s,i) => s + i.quantity, 0);
    const valeur = items.reduce((s,i) => s + i.quantity * i.price, 0);
    document.getElementById('stats').innerHTML =
      '<div class="stat-card"><div class="value">' + items.length + '</div><div class="label">Références</div></div>' +
      '<div class="stat-card"><div class="value">' + total + '</div><div class="label">Articles en stock</div></div>' +
      '<div class="stat-card"><div class="value">' + Math.round(valeur/1000) + 'K</div><div class="label">Valeur totale (FCFA)</div></div>';
  }
  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('name').value,
        quantity: +document.getElementById('quantity').value,
        price: +document.getElementById('price').value,
        category: document.getElementById('category').value
      })
    });
    e.target.reset();
    loadData();
  });
  loadData();
</script>
</body>
</html>`);
});

// API routes
app.get('/api/inventory', (req, res) => res.json(inventory));

app.post('/api/inventory', (req, res) => {
  const { name, quantity, price, category } = req.body;
  if (!name || quantity === undefined || price === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const item = { id: nextId++, name, quantity: +quantity, price: +price, category: category || 'Autre' };
  inventory.push(item);
  res.status(201).json(item);
});

app.delete('/api/inventory/:id', (req, res) => {
  const id = +req.params.id;
  inventory = inventory.filter(i => i.id !== id);
  res.status(204).send();
});

app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.listen(PORT, () => console.log(`Inventory App running on port ${PORT}`));
