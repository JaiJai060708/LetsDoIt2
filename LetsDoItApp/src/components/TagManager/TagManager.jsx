import { useState, useEffect, useRef } from 'react';
import { getAvailableTags, addTag, updateTag, deleteTag } from '../../db/database';
import styles from './TagManager.module.css';

// Predefined color palette for tags
const TAG_COLORS = [
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#3b82f6', name: 'Blue' },
  { color: '#10b981', name: 'Emerald' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#ef4444', name: 'Red' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#84cc16', name: 'Lime' },
  { color: '#f97316', name: 'Orange' },
  { color: '#6366f1', name: 'Indigo' },
  { color: '#14b8a6', name: 'Teal' },
  { color: '#a855f7', name: 'Violet' },
];

function TagManager({ isOpen, onClose, onTagsChanged }) {
  const [tags, setTags] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].color);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const editInputRef = useRef(null);
  const newInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (isAdding && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [isAdding]);

  const loadTags = async () => {
    const availableTags = await getAvailableTags();
    setTags(availableTags);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setEditingId(null);
    setIsAdding(false);
    setDeleteConfirmId(null);
    onClose();
  };

  const handleStartEdit = (tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setDeleteConfirmId(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    
    await updateTag(editingId, {
      name: editName.trim(),
      color: editColor,
    });
    
    setEditingId(null);
    await loadTags();
    onTagsChanged?.();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleDeleteClick = (tagId) => {
    setDeleteConfirmId(tagId);
    setEditingId(null);
  };

  const handleConfirmDelete = async (tagId) => {
    await deleteTag(tagId);
    setDeleteConfirmId(null);
    await loadTags();
    onTagsChanged?.();
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleAddNew = async () => {
    if (!newTagName.trim()) return;
    
    await addTag({
      name: newTagName.trim(),
      color: newTagColor,
    });
    
    setNewTagName('');
    setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].color);
    setIsAdding(false);
    await loadTags();
    onTagsChanged?.();
  };

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      if (editingId) handleCancelEdit();
      if (isAdding) setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🏷️</span>
            <h2 className={styles.title}>Manage Tags</h2>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className={styles.content}>
          {tags.length === 0 && !isAdding ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏷️</div>
              <p className={styles.emptyTitle}>No tags yet</p>
              <p className={styles.emptyText}>Create your first tag to organize your tasks</p>
            </div>
          ) : (
            <div className={styles.tagList}>
              {tags.map((tag) => (
                <div key={tag.id} className={styles.tagItem}>
                  {deleteConfirmId === tag.id ? (
                    <div className={styles.deleteConfirm}>
                      <span className={styles.deleteMessage}>Delete "{tag.name}"?</span>
                      <div className={styles.deleteActions}>
                        <button
                          className={styles.cancelDeleteBtn}
                          onClick={handleCancelDelete}
                        >
                          Cancel
                        </button>
                        <button
                          className={styles.confirmDeleteBtn}
                          onClick={() => handleConfirmDelete(tag.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : editingId === tag.id ? (
                    <div className={styles.editForm}>
                      <input
                        ref={editInputRef}
                        type="text"
                        className={styles.editInput}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                        placeholder="Tag name"
                      />
                      <div className={styles.colorPicker}>
                        {TAG_COLORS.map(({ color }) => (
                          <button
                            key={color}
                            type="button"
                            className={`${styles.colorBtn} ${editColor === color ? styles.selected : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                      <div className={styles.editActions}>
                        <button className={styles.cancelBtn} onClick={handleCancelEdit}>
                          Cancel
                        </button>
                        <button
                          className={styles.saveBtn}
                          onClick={handleSaveEdit}
                          disabled={!editName.trim()}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.tagInfo}>
                        <span
                          className={styles.tagColor}
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className={styles.tagName}>{tag.name}</span>
                      </div>
                      <div className={styles.tagActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleStartEdit(tag)}
                          aria-label="Edit tag"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteClick(tag.id)}
                          aria-label="Delete tag"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdding && (
            <div className={styles.addForm}>
              <div className={styles.addFormHeader}>
                <span className={styles.addFormTitle}>New Tag</span>
              </div>
              <input
                ref={newInputRef}
                type="text"
                className={styles.addInput}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleAddNew)}
                placeholder="Enter tag name..."
              />
              <div className={styles.colorPicker}>
                {TAG_COLORS.map(({ color, name }) => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.colorBtn} ${newTagColor === color ? styles.selected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                    title={name}
                    aria-label={`Select ${name} color`}
                  />
                ))}
              </div>
              <div className={styles.addFormPreview}>
                <span className={styles.previewLabel}>Preview:</span>
                <span
                  className={styles.previewTag}
                  style={{
                    backgroundColor: newTagColor + '20',
                    color: newTagColor,
                    borderColor: newTagColor,
                  }}
                >
                  {newTagName || 'Tag name'}
                </span>
              </div>
              <div className={styles.addFormActions}>
                <button className={styles.cancelBtn} onClick={() => setIsAdding(false)}>
                  Cancel
                </button>
                <button
                  className={styles.createBtn}
                  onClick={handleAddNew}
                  disabled={!newTagName.trim()}
                >
                  Create Tag
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          {!isAdding && (
            <button className={styles.addTagBtn} onClick={() => setIsAdding(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add New Tag
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default TagManager;


