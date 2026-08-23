const express = require('express');
const db = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: list all categories
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json({ categories });
});

// Admin: create category
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: 'A category with this name already exists' });

  const info = db
    .prepare('INSERT INTO categories (name, description, color) VALUES (?,?,?)')
    .run(name, description || null, color || '#C9B8DB');
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ category });
});

// Admin: update category
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { name, description, color } = req.body;
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  db.prepare('UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?').run(
    name || category.name,
    description !== undefined ? description : category.description,
    color || category.color,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json({ category: updated });
});

// Admin: delete category
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events WHERE category_id = ?').get(req.params.id).c;
  if (eventCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${eventCount} event(s) still use this category` });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
