import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  LayoutGrid,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Film,
  Tv,
  Save,
  CheckCircle,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import API from "../api/axios";
import "./Category.css";

export default function CategoryPage() {
  // Category state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"

  // Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [modalForm, setModalForm] = useState({ id: null, name: "", color: "#e50914", priority: 1 });
  const [savingCategory, setSavingCategory] = useState(false);

  // Active Curated Drawer state
  const [openDrawerCatId, setOpenDrawerCatId] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [curatedItems, setCuratedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [savingCurated, setSavingCurated] = useState(false);
  const [curatedSavedFeedback, setCuratedSavedFeedback] = useState(false);

  // Alerts
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const showErr = (err) => {
    setError(err);
    setTimeout(() => setError(""), 5000);
  };

  // Fetch all categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/categories");
      if (res.data?.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
      showErr(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Top stats counters
  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const inactiveCount = categories.filter((c) => c.isActive === false).length;

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const isActive = c.isActive !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  // Toggle Active/Inactive status
  const handleToggleStatus = async (cat) => {
    try {
      const res = await API.patch(`/admin/categories/${cat._id}/toggle-status`);
      if (res.data?.success) {
        setCategories((prev) =>
          prev.map((item) =>
            item._id === cat._id ? { ...item, isActive: res.data.category.isActive } : item
          )
        );
        showMsg(`Category "${cat.name}" is now ${res.data.category.isActive ? "Active" : "Inactive"}`);
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      showErr(err.response?.data?.message || "Failed to toggle status");
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      await API.delete(`/admin/categories/${cat._id}`);
      if (openDrawerCatId === cat._id) setOpenDrawerCatId(null);
      fetchCategories();
      showMsg(`Category "${cat.name}" deleted successfully`);
    } catch (err) {
      console.error("Delete category error:", err);
      showErr(err.response?.data?.message || "Failed to delete category");
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextPriority = categories.length > 0 ? Math.max(...categories.map((c) => c.priority || 0)) + 1 : 1;
    setModalForm({ id: null, name: "", color: "#e50914", priority: nextPriority });
    setModalMode("create");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setModalForm({
      id: cat._id,
      name: cat.name,
      color: cat.color || "#e50914",
      priority: cat.priority !== undefined ? cat.priority : 1,
    });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // Save Category Modal (Create / Edit)
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) return;

    try {
      setSavingCategory(true);
      if (modalMode === "create") {
        const res = await API.post("/admin/categories", {
          name: modalForm.name.trim(),
          color: modalForm.color,
          priority: Number(modalForm.priority) || 1,
        });
        if (res.data?.success) {
          showMsg("Category created successfully! 🎉");
          setIsModalOpen(false);
          fetchCategories();
        }
      } else {
        const res = await API.patch(`/admin/categories/${modalForm.id}`, {
          name: modalForm.name.trim(),
          color: modalForm.color,
          priority: Number(modalForm.priority) || 1,
        });
        if (res.data?.success) {
          showMsg("Category updated successfully! ✅");
          setIsModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err) {
      console.error("Save category error:", err);
      showErr(err.response?.data?.message || "Failed to save category");
    } finally {
      setSavingCategory(false);
    }
  };

  // ─── Curated Drawer Handlers ────────────────────────────
  const handleToggleCuratedDrawer = async (catId) => {
    if (openDrawerCatId === catId) {
      setOpenDrawerCatId(null);
      return;
    }

    setOpenDrawerCatId(catId);
    setDrawerLoading(true);
    setDrawerSearch("");
    setCuratedSavedFeedback(false);

    try {
      const res = await API.get(`/admin/categories/${catId}/curated-content`);
      if (res.data?.success) {
        setCuratedItems(res.data.curatedItems || []);
        setAvailableItems(res.data.availableItems || []);
      }
    } catch (err) {
      console.error("Load curated content error:", err);
      showErr(err.response?.data?.message || "Failed to load curated content for this category");
    } finally {
      setDrawerLoading(false);
    }
  };

  // Move / Shift item position in Curated Order
  const handleSetPosition = (itemId, newPosStr) => {
    const targetPos = parseInt(newPosStr, 10);
    if (isNaN(targetPos) || targetPos < 1) return;

    setCuratedItems((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === itemId);
      if (currentIndex === -1) return prev;

      const itemToMove = prev[currentIndex];
      const listWithoutItem = prev.filter((_, idx) => idx !== currentIndex);

      // Clamp new index
      const newIndex = Math.max(0, Math.min(targetPos - 1, listWithoutItem.length));
      listWithoutItem.splice(newIndex, 0, itemToMove);

      // Re-index clean consecutive positions 1, 2, 3...
      return listWithoutItem.map((it, idx) => ({
        ...it,
        position: idx + 1,
      }));
    });
  };

  // Nudge position up or down (1-click arrow)
  const handleNudgePosition = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= curatedItems.length) return;

    setCuratedItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((it, idx) => ({ ...it, position: idx + 1 }));
    });
  };

  // Remove card from Curated (moves to Available)
  const handleRemoveFromCurated = (item) => {
    setCuratedItems((prev) => {
      const updated = prev.filter((it) => it.id !== item.id);
      return updated.map((it, idx) => ({ ...it, position: idx + 1 }));
    });
    setAvailableItems((prev) => [{ ...item, isSelected: false }, ...prev]);
  };

  // Add card from Available to Curated (appends to end)
  const handleAddToCurated = (item) => {
    setAvailableItems((prev) => prev.filter((it) => it.id !== item.id));
    setCuratedItems((prev) => [
      ...prev,
      {
        ...item,
        position: prev.length + 1,
        isSelected: true,
      },
    ]);
  };

  // Add All remaining available items to curated
  const handleAddAllToCurated = () => {
    if (availableItems.length === 0) return;
    const additions = availableItems.map((item, idx) => ({
      ...item,
      position: curatedItems.length + idx + 1,
      isSelected: true,
    }));
    setCuratedItems((prev) => [...prev, ...additions]);
    setAvailableItems([]);
  };

  // Clear Row (remove all from curated)
  const handleClearRow = () => {
    if (curatedItems.length === 0) return;
    if (!window.confirm("Remove all items from this category's display row?")) return;
    setAvailableItems((prev) => [...curatedItems.map((it) => ({ ...it, isSelected: false })), ...prev]);
    setCuratedItems([]);
  };

  // Save Curated Order to Database
  const handleSaveCuratedOrder = async () => {
    if (!openDrawerCatId) return;
    try {
      setSavingCurated(true);
      const res = await API.put(`/admin/categories/${openDrawerCatId}/curated-content`, {
        curatedItems: curatedItems.map((it, idx) => ({
          id: it.id,
          type: it.type,
          position: it.position || idx + 1,
        })),
      });
      if (res.data?.success) {
        setCuratedSavedFeedback(true);
        showMsg("Curated display order and positions saved successfully! ✅");
        setTimeout(() => setCuratedSavedFeedback(false), 3000);
        // Refresh categories count
        fetchCategories();
      }
    } catch (err) {
      console.error("Save curated order error:", err);
      showErr(err.response?.data?.message || "Failed to save curated display order");
    } finally {
      setSavingCurated(false);
    }
  };

  // Filter curated and available items in drawer based on drawerSearch
  const filteredCuratedItems = useMemo(() => {
    if (!drawerSearch.trim()) return curatedItems;
    return curatedItems.filter((it) =>
      it.title.toLowerCase().includes(drawerSearch.toLowerCase())
    );
  }, [curatedItems, drawerSearch]);

  const filteredAvailableItems = useMemo(() => {
    if (!drawerSearch.trim()) return availableItems;
    return availableItems.filter((it) =>
      it.title.toLowerCase().includes(drawerSearch.toLowerCase())
    );
  }, [availableItems, drawerSearch]);

  return (
    <div className="page-section category-mgmt-page">
      {/* ── Top Header ── */}
      <div className="cat-header-wrap">
        <div>
          <h1 className="cat-title">
            <Layers size={28} style={{ color: "#e50914" }} /> Categories
          </h1>
          <p className="cat-subtitle">
            Manage content categories and set curated display order for mobile apps and website.
          </p>
        </div>

        <div className="cat-header-actions">
          <button
            type="button"
            className="cat-btn-secondary"
            onClick={fetchCategories}
            disabled={loading}
            title="Refresh Categories"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            className="cat-btn-primary"
            onClick={handleOpenCreateModal}
            title="Create New Category"
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="pg-alert pg-alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="pg-alert pg-alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Top Stat Cards (Reference Image 1 Match) ── */}
      <div className="cat-stats-row">
        <div className="cat-stat-card">
          <div className="cat-stat-val">{totalCount}</div>
          <div className="cat-stat-lbl">TOTAL</div>
        </div>

        <div className="cat-stat-card">
          <div className="cat-stat-val" style={{ color: "#22c55e" }}>
            {activeCount}
          </div>
          <div className="cat-stat-lbl">ACTIVE</div>
        </div>

        <div className="cat-stat-card">
          <div className="cat-stat-val" style={{ color: "#94a3b8" }}>
            {inactiveCount}
          </div>
          <div className="cat-stat-lbl">INACTIVE</div>
        </div>
      </div>

      {/* ── Toolbar: Search & Filter Tabs ── */}
      <div className="cat-toolbar-card">
        <div className="cat-search-box">
          <Search size={17} style={{ color: "#94a3b8" }} />
          <input
            type="text"
            className="cat-search-input"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cat-filter-tabs">
          <button
            type="button"
            className={`cat-filter-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`cat-filter-tab ${statusFilter === "active" ? "active" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            Active
          </button>
          <button
            type="button"
            className={`cat-filter-tab ${statusFilter === "inactive" ? "active" : ""}`}
            onClick={() => setStatusFilter("inactive")}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* ── Categories Table ── */}
      <div className="cat-table-card">
        <div className="cat-table-wrap">
          <table className="cat-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>#</th>
                <th>CATEGORY</th>
                <th>SLUG</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th style={{ textAlign: "right", paddingRight: 24 }}>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    {loading ? "Loading categories..." : "No categories found."}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => {
                  const isDrawerOpen = openDrawerCatId === cat._id;
                  const isActive = cat.isActive !== false;
                  const firstLetter = (cat.name || "C").charAt(0).toUpperCase();
                  const createdDate = cat.createdAt
                    ? new Date(cat.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <React.Fragment key={cat._id}>
                      <tr className={`cat-data-row ${isDrawerOpen ? "is-drawer-open" : ""}`}>
                        <td className="cat-cell-num">{index + 1}</td>

                        <td>
                          <div className="cat-cell-name-wrap">
                            <div
                              className="cat-avatar-initial"
                              style={{ background: cat.color || "#e50914" }}
                            >
                              {firstLetter}
                            </div>
                            <span className="cat-name-txt">{cat.name}</span>
                            <span className="cat-content-count-tag" title="Items in this category">
                              {cat.contentCount || 0} items
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="cat-slug-pill">{cat.slug}</span>
                        </td>

                        <td>
                          <span className="cat-priority-badge">{cat.priority ?? 0}</span>
                        </td>

                        <td>
                          <span className={`cat-status-pill ${isActive ? "active" : "inactive"}`}>
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>

                        <td>
                          <span className="cat-created-txt">{createdDate}</span>
                        </td>

                        <td>
                          <div className="cat-actions-cell" style={{ justifyContent: "flex-end" }}>
                            {/* Toggle Switch */}
                            <label className="cat-toggle-switch" title={`Toggle ${cat.name} Active/Inactive`}>
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleToggleStatus(cat)}
                              />
                              <span className="cat-toggle-slider"></span>
                            </label>

                            {/* Curate Content Grid Button */}
                            <button
                              type="button"
                              className={`cat-action-btn curate-btn ${isDrawerOpen ? "is-open" : ""}`}
                              onClick={() => handleToggleCuratedDrawer(cat._id)}
                              title={isDrawerOpen ? "Close Curated Content Drawer" : "Curate Content & Order"}
                            >
                              <LayoutGrid size={16} />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              className="cat-action-btn edit-btn"
                              onClick={() => handleOpenEditModal(cat)}
                              title="Edit Category"
                            >
                              <Pencil size={15} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              className="cat-action-btn delete-btn"
                              onClick={() => handleDeleteCategory(cat)}
                              title="Delete Category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── EXPANDABLE CURATED DRAWER (Reference Image 2 Match) ── */}
                      {isDrawerOpen && (
                        <tr className="cat-drawer-row">
                          <td colSpan="7" style={{ padding: 0 }}>
                            <div className="cat-drawer-container">
                              {drawerLoading ? (
                                <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
                                  <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
                                  <div>Loading category content...</div>
                                </div>
                              ) : (
                                <>
                                  {/* Drawer Action Bar */}
                                  <div className="cat-drawer-head">
                                    <div className="cat-drawer-head-left">
                                      <span className="cat-selected-counter-badge">
                                        {curatedItems.length} of {curatedItems.length + availableItems.length} Selected
                                      </span>

                                      {availableItems.length > 0 && (
                                        <button
                                          type="button"
                                          className="cat-drawer-btn"
                                          onClick={handleAddAllToCurated}
                                          title="Add all available content to this category"
                                        >
                                          + Add All ({availableItems.length})
                                        </button>
                                      )}

                                      {curatedItems.length > 0 && (
                                        <button
                                          type="button"
                                          className="cat-drawer-btn"
                                          onClick={handleClearRow}
                                          title="Remove all items from this row"
                                        >
                                          Clear Row
                                        </button>
                                      )}
                                    </div>

                                    <div className="cat-drawer-head-right">
                                      <div className="cat-drawer-search">
                                        <Search size={15} style={{ color: "#94a3b8" }} />
                                        <input
                                          type="text"
                                          placeholder="Filter available content..."
                                          value={drawerSearch}
                                          onChange={(e) => setDrawerSearch(e.target.value)}
                                        />
                                      </div>

                                      <button
                                        type="button"
                                        className={`cat-drawer-save-btn ${curatedSavedFeedback ? "is-saved" : ""}`}
                                        onClick={handleSaveCuratedOrder}
                                        disabled={savingCurated}
                                      >
                                        {savingCurated ? (
                                          <>
                                            <RefreshCw size={15} className="spin" /> Saving...
                                          </>
                                        ) : curatedSavedFeedback ? (
                                          <>
                                            <Check size={16} /> Saved!
                                          </>
                                        ) : (
                                          <>
                                            <Save size={16} /> Save Curated Order
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* ── Section 1: Curated Display Order ── */}
                                  <div className="cat-drawer-section-title curated">
                                    <span className="cat-dot-indicator green"></span>
                                    <span>Curated Display Order (Type position number and press enter to reorder):</span>
                                  </div>

                                  {filteredCuratedItems.length === 0 ? (
                                    <div className="cat-empty-msg">
                                      {curatedItems.length === 0
                                        ? "No content in this category yet. Click any card below in Available Content to add it!"
                                        : "No curated content matches your search filter."}
                                    </div>
                                  ) : (
                                    <div className="cat-cards-grid">
                                      {filteredCuratedItems.map((item, idx) => (
                                        <div key={item.id} className="cat-content-card">
                                          {item.poster ? (
                                            <img
                                              src={item.poster}
                                              alt={item.title}
                                              className="cat-card-poster"
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                              }}
                                            />
                                          ) : (
                                            <div className="cat-card-placeholder-bg" />
                                          )}

                                          <div className="cat-card-overlay" />

                                          {/* Green Checkmark */}
                                          <div className="cat-card-check-badge" title="Included in Category">
                                            <Check size={13} strokeWidth={3} />
                                          </div>

                                          {/* Red Remove Button */}
                                          <button
                                            type="button"
                                            className="cat-card-remove-btn"
                                            onClick={() => handleRemoveFromCurated(item)}
                                            title="Remove from Category Row"
                                          >
                                            <X size={13} strokeWidth={3} />
                                          </button>

                                          {/* Position Badge & Editable Input */}
                                          <div className="cat-pos-tag-wrap">
                                            <button
                                              type="button"
                                              className="cat-pos-arrow"
                                              onClick={() => handleNudgePosition(idx, -1)}
                                              disabled={idx === 0}
                                              title="Move Left"
                                            >
                                              ◀
                                            </button>

                                            <div className="cat-pos-input-badge">
                                              <span>POS</span>
                                              <input
                                                type="number"
                                                min="1"
                                                max={curatedItems.length}
                                                className="cat-pos-input"
                                                defaultValue={item.position || idx + 1}
                                                key={`${item.id}-${item.position || idx + 1}`}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    handleSetPosition(item.id, e.target.value);
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  handleSetPosition(item.id, e.target.value);
                                                }}
                                                title="Type position number and press Enter"
                                              />
                                            </div>

                                            <button
                                              type="button"
                                              className="cat-pos-arrow"
                                              onClick={() => handleNudgePosition(idx, 1)}
                                              disabled={idx === curatedItems.length - 1}
                                              title="Move Right"
                                            >
                                              ▶
                                            </button>
                                          </div>

                                          {/* Bottom Card Title & Type */}
                                          <div className="cat-card-info">
                                            <span className="cat-card-title" title={item.title}>
                                              {item.title}
                                            </span>
                                            <span
                                              className={`cat-card-type-badge ${
                                                item.type === "movie" ? "movie" : "series"
                                              }`}
                                            >
                                              {item.type === "movie" ? "MOVIE" : "SERIES"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* ── Section 2: Available Content ── */}
                                  <div className="cat-drawer-section-title available">
                                    <span className="cat-dot-indicator grey"></span>
                                    <span>
                                      Available Content ({availableItems.length}) — Click card or '+' to add to row:
                                    </span>
                                  </div>

                                  {filteredAvailableItems.length === 0 ? (
                                    <div className="cat-empty-msg">
                                      {availableItems.length === 0
                                        ? "All available content in the platform is currently selected in this category."
                                        : "No available content matches your filter."}
                                    </div>
                                  ) : (
                                    <div className="cat-cards-grid">
                                      {filteredAvailableItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="cat-content-card is-available"
                                          onClick={() => handleAddToCurated(item)}
                                          title={`Click to add "${item.title}" to ${cat.name}`}
                                        >
                                          {item.poster ? (
                                            <img
                                              src={item.poster}
                                              alt={item.title}
                                              className="cat-card-poster"
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                              }}
                                            />
                                          ) : (
                                            <div className="cat-card-placeholder-bg" />
                                          )}

                                          <div className="cat-card-overlay" />

                                          {/* Add Button */}
                                          <button
                                            type="button"
                                            className="cat-card-add-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddToCurated(item);
                                            }}
                                            title="Add to row"
                                          >
                                            <Plus size={15} strokeWidth={3} />
                                          </button>

                                          <div className="cat-available-hover-hint">+ Add to Category</div>

                                          <div className="cat-card-info">
                                            <span className="cat-card-title" title={item.title}>
                                              {item.title}
                                            </span>
                                            <span
                                              className={`cat-card-type-badge ${
                                                item.type === "movie" ? "movie" : "series"
                                              }`}
                                            >
                                              {item.type === "movie" ? "MOVIE" : "SERIES"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Category Modal ── */}
      {isModalOpen && (
        <div className="cat-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cat-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-head">
              <h3>{modalMode === "create" ? "Create New Category" : "Edit Category"}</h3>
              <button
                type="button"
                className="cat-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="cat-modal-body">
                <div className="cat-form-group">
                  <label className="cat-form-label">Category Name</label>
                  <input
                    type="text"
                    className="cat-form-input"
                    placeholder="e.g. Mirchi in Telugu, Trending, New Shows"
                    value={modalForm.name}
                    onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="cat-form-group">
                    <label className="cat-form-label">Category Color</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="color"
                        value={modalForm.color}
                        onChange={(e) => setModalForm({ ...modalForm, color: e.target.value })}
                        style={{
                          width: 44,
                          height: 38,
                          padding: 2,
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      />
                      <input
                        type="text"
                        className="cat-form-input"
                        value={modalForm.color}
                        onChange={(e) => setModalForm({ ...modalForm, color: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="cat-form-group">
                    <label className="cat-form-label">Display Priority</label>
                    <input
                      type="number"
                      min="0"
                      className="cat-form-input"
                      placeholder="0, 1, 2, 3..."
                      value={modalForm.priority}
                      onChange={(e) => setModalForm({ ...modalForm, priority: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="cat-modal-foot">
                <button
                  type="button"
                  className="cat-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cat-btn-primary"
                  disabled={savingCategory}
                >
                  {savingCategory ? "Saving..." : modalMode === "create" ? "Create Category" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
