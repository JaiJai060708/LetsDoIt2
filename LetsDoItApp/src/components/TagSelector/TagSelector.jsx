import { useState, useEffect, useRef } from 'react';
import { getAvailableTags, addTag, updateTag, deleteTag } from '../../db/database';
import styles from './TagSelector.module.css';

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
];

function TagSelector({ selectedTags = [], onChange, compact = false }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Tag management states
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].color);
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingTag && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTag]);

  const loadTags = async () => {
    const tags = await getAvailableTags();
    setAvailableTags(tags);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsCreating(false);
    setEditingTag(null);
    setDeleteConfirmId(null);
  };

  const handleTagToggle = (tagId) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
    onChange(newSelectedTags);
  };

  const handleCreateTag = async (e) => {
    e?.preventDefault();
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    const newTag = await addTag({
      name: trimmedName,
      color: newTagColor,
    });

    setAvailableTags([...availableTags, newTag]);
    onChange([...selectedTags, newTag.id]);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].color);
    setIsCreating(false);
  };

  // Start editing a tag
  const handleStartEdit = (tag, e) => {
    e.stopPropagation();
    setEditingTag(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setDeleteConfirmId(null);
  };

  // Save tag edit
  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    
    await updateTag(editingTag, {
      name: editName.trim(),
      color: editColor,
    });
    
    await loadTags();
    setEditingTag(null);
  };

  // Delete tag
  const handleDeleteTag = async (tagId) => {
    await deleteTag(tagId);
    // Remove from selected if it was selected
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    }
    await loadTags();
    setDeleteConfirmId(null);
  };

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      if (isCreating) setIsCreating(false);
      if (editingTag) setEditingTag(null);
    }
  };

  const getTagById = (tagId) => availableTags.find((t) => t.id === tagId);

  const selectedTagObjects = selectedTags
    .map(getTagById)
    .filter(Boolean);

  return (
    <div className={`${styles.tagSelector} ${compact ? styles.compact : ''}`} ref={dropdownRef}>
      <div className={styles.selectedTags} onClick={() => setIsOpen(!isOpen)}>
        {selectedTagObjects.length > 0 ? (
          selectedTagObjects.map((tag) => (
            <span
              key={tag.id}
              className={styles.tag}
              style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
            >
              {tag.name}
              <button
                className={styles.removeTag}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagToggle(tag.id);
                }}
                style={{ color: tag.color }}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className={styles.placeholder}>Add tags...</span>
        )}
        <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Tags</span>
          </div>
          
          <div className={styles.tagList}>
            {availableTags.length === 0 && !isCreating ? (
              <p className={styles.noTags}>No tags yet. Create your first tag below!</p>
            ) : (
              availableTags.map((tag) => (
                <div key={tag.id} className={styles.tagRow}>
                  {deleteConfirmId === tag.id ? (
                    <div className={styles.deleteConfirm}>
                      <span className={styles.deleteMessage}>Delete?</span>
                      <div className={styles.deleteActions}>
                        <button
                          type="button"
                          className={styles.cancelDeleteBtn}
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className={styles.confirmDeleteBtn}
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          Yes
                        </button>
                      </div>
                    </div>
                  ) : editingTag === tag.id ? (
                    <div className={styles.editForm}>
                      <input
                        ref={editInputRef}
                        type="text"
                        className={styles.editInput}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                      />
                      <div className={styles.colorPicker}>
                        {TAG_COLORS.map(({ color }) => (
                          <button
                            key={color}
                            type="button"
                            className={`${styles.colorOption} ${editColor === color ? styles.selected : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>
                      <div className={styles.editActions}>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={() => setEditingTag(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
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
                      <label className={styles.tagOption}>
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => handleTagToggle(tag.id)}
                        />
                        <span
                          className={styles.tagPreview}
                          style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      </label>
                      <div className={styles.tagActions}>
                        <button
                          type="button"
                          className={styles.editTagBtn}
                          onClick={(e) => handleStartEdit(tag, e)}
                          title="Edit tag"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.deleteTagBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(tag.id);
                            setEditingTag(null);
                          }}
                          title="Delete tag"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={styles.divider} />

          {isCreating ? (
            <form className={styles.createForm} onSubmit={handleCreateTag}>
              <input
                ref={inputRef}
                type="text"
                className={styles.createInput}
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
              <div className={styles.colorPicker}>
                {TAG_COLORS.map(({ color }) => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.colorOption} ${newTagColor === color ? styles.selected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
              <div className={styles.createPreview}>
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
              <div className={styles.createActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.createBtn} disabled={!newTagName.trim()}>
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button className={styles.addNewBtn} onClick={() => setIsCreating(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create new tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TagSelector;
