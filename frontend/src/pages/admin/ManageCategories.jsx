import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import './AdminPages.css';

const SWATCHES = ['#E8B4D8', '#B4C8E8', '#B4E8C8', '#E8D4B4', '#D8B4E8', '#F0BFD6', '#B9A6DE', '#A3D9BB'];

const emptyForm = { name: '', description: '', color: SWATCHES[0] };

export default function ManageCategories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => api.getCategories().then((d) => setCategories(d.categories)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, description: c.description || '', color: c.color }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api.updateCategory(token, editing.id, form);
      else await api.createCategory(token, form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.deleteCategory(token, c.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container admin-page">
      <div className="admin-header-row">
        <div>
          <h1>Event categories</h1>
          <p className="admin-subtitle" style={{ marginBottom: 0 }}>Organize events into browsable categories.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New category</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Color</th><th>Name</th><th>Description</th><th></th></tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: c.color }} /></td>
                <td>{c.name}</td>
                <td>{c.description || '—'}</td>
                <td>
                  <div className="admin-table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="card modal-panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h2>{editing ? 'Edit category' : 'New category'}</h2>
            <div className="field">
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Color</label>
              <div className="swatch-row">
                {SWATCHES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={`swatch ${form.color === s ? 'swatch-active' : ''}`}
                    style={{ background: s }}
                    onClick={() => setForm({ ...form, color: s })}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save category'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
