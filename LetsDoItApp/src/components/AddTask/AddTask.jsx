import { useState, useRef, useEffect } from 'react';
import { createTask, getAvailableTags, addTag, updateTag, deleteTag } from '../../db/database';
import styles from './AddTask.module.css';

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

function AddTask({ onTaskCreated, defaultDueDate = null, compact = false }) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tag management states
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].color);
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const inputRef = useRef(null);
  const tagPickerRef = useRef(null);
  const newTagInputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    // Don't auto-focus on mobile to prevent keyboard from opening unexpectedly
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!compact && !isMobile) {
      inputRef.current?.focus();
    }
    loadTags();
  }, [compact]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(event.target)) {
        closeTagPicker();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCreating && newTagInputRef.current) {
      newTagInputRef.current.focus();
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

  const closeTagPicker = () => {
    setShowTagPicker(false);
    setIsCreating(false);
    setEditingTag(null);
    setDeleteConfirmId(null);
  };

  const handleTagToggle = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const getTagById = (tagId) => availableTags.find((t) => t.id === tagId);

  // Create new tag
  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    const newTag = await addTag({
      name: trimmedName,
      color: newTagColor,
    });

    setAvailableTags([...availableTags, newTag]);
    setSelectedTags([...selectedTags, newTag.id]);
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
    setSelectedTags(selectedTags.filter(id => id !== tagId));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const newTask = await createTask({
        content: trimmedContent,
        dueDate: defaultDueDate ? defaultDueDate.toISOString() : new Date().toISOString(),
        note: null,
        doneAt: null,
        tags: selectedTags,
      });
      
      setContent('');
      setSelectedTags([]);
      onTaskCreated?.(newTask);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      className={`${styles.addTask} ${compact ? styles.compact : ''}`} 
      onSubmit={handleSubmit}
    >
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Add a new task..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
        />
        {selectedTags.length > 0 && (
          <div className={styles.selectedTags}>
            {selectedTags.map((tagId) => {
              const tag = getTagById(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tag.id}
                  className={styles.selectedTag}
                  style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
      
      <div className={styles.tagPickerWrapper} ref={tagPickerRef}>
        <button
          type="button"
          className={`${styles.tagBtn} ${selectedTags.length > 0 ? styles.hasSelection : ''}`}
          onClick={() => setShowTagPicker(!showTagPicker)}
          title="Add tags"
        >
          🏷️
        </button>
        
        {showTagPicker && (
          <div className={styles.tagDropdown}>
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
                              className={`${styles.colorBtn} ${editColor === color ? styles.selected : ''}`}
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
              <div className={styles.createForm}>
                <input
                  ref={newTagInputRef}
                  type="text"
                  className={styles.createInput}
                  placeholder="Tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleCreateTag)}
                />
                <div className={styles.colorPicker}>
                  {TAG_COLORS.map(({ color }) => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.colorBtn} ${newTagColor === color ? styles.selected : ''}`}
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
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.createBtn}
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addNewBtn}
                onClick={() => setIsCreating(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create new tag
              </button>
            )}
          </div>
        )}
      </div>
      
      <button 
        type="submit" 
        className={styles.button}
        disabled={!content.trim() || isSubmitting}
      >
        {compact ? '+' : 'Add'}
      </button>
    </form>
  );
}

export default AddTask;
