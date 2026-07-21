import { useState, useRef, useEffect } from "react";
import {
  Star,
  Globe,
  Calendar,
  Clock,
  Tag,
  Layers,
  Rocket,
  Lock,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function BasicInfoSection({
  form,
  ch,
  categories = [],
  onAddCategory,
  onRemoveCategory,
}) {
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedSlugs   = Array.isArray(form.category) ? form.category : [];
  const availableCats   = categories.filter(c => !selectedSlugs.includes(c.slug));

  return (
    <div className="premium-card">
      <h3 className="section-title">
        <span>
          <Star size={18} />
        </span>

        Basic Information
      </h3>

      <div
        className="form-2col"
        style={{ marginBottom: 20 }}
      >
        <div className="form-row form-full">
          <label className="form-label">
            Content Title *
          </label>

          <input
            className="form-input-styled"
            name="title"
            placeholder="e.g. Inception"
            onChange={ch}
            value={form.title}
            required
          />
        </div>

        <div className="form-row form-full">
          <label className="form-label">
            Synopsis / Description *
          </label>

          <textarea
            className="form-input-styled"
            name="description"
            placeholder="A brief summary of the plot..."
            rows={3}
            onChange={ch}
            value={form.description}
            required
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label className="form-label">
            <Globe
              size={14}
              style={{ marginRight: 4 }}
            />

            Language
          </label>

          <input
            className="form-input-styled"
            name="language"
            placeholder="English, Hindi, etc."
            onChange={ch}
            value={form.language}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Calendar
              size={14}
              style={{ marginRight: 4 }}
            />

            Release Year
          </label>

          <input
            className="form-input-styled"
            name="releaseYear"
            type="number"
            placeholder="2024"
            onChange={ch}
            value={form.releaseYear}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Clock
              size={14}
              style={{ marginRight: 4 }}
            />

            {form.type === "movie"
              ? "Duration"
              : "Avg. Ep Duration"}
          </label>

          <input
            className="form-input-styled"
            name="duration"
            placeholder="e.g. 2h 15m"
            onChange={ch}
            value={form.duration}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Tag
              size={14}
              style={{ marginRight: 4 }}
            />

            Genres
          </label>

          <input
            className="form-input-styled"
            name="genre"
            placeholder="Action, Sci-Fi, Drama"
            onChange={ch}
            value={form.genre}
          />
        </div>

        {/* ── Category Chip Picker ────────────────── */}
        <div className="form-row" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label">
            <Layers size={14} style={{ marginRight: 4 }} />
            Category
          </label>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "8px 12px",
            }}
          >
            {/* Selected chips */}
            {selectedSlugs.map(slug => {
              const cat = categories.find(c => c.slug === slug);
              const displayName  = cat?.name  || slug;
              const chipColor    = cat?.color  || "#6366f1";
              return (
                <span
                  key={slug}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: `${chipColor}22`,
                    border: `1px solid ${chipColor}88`,
                    color: chipColor,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    letterSpacing: "0.3px",
                    textShadow: `0 0 8px ${chipColor}66`,
                  }}
                >
                  {displayName}
                  <button
                    type="button"
                    onClick={() => onRemoveCategory?.(slug)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: chipColor,
                      padding: 0,
                      lineHeight: 1,
                      fontSize: "1.1rem",
                      opacity: 0.6,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}

            {/* + Add button + dropdown */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowCatDropdown(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 12px", borderRadius: 20,
                  background: "var(--bg2)",
                  border: "1px dashed var(--border)",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                }}
              >
                + Add
              </button>

              {showCatDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 200,
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 220,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Available categories */}
                  {availableCats.length > 0 ? (
                    availableCats.map(cat => (
                      <div
                        key={cat.slug}
                        onClick={() => { onAddCategory?.(cat.slug); setShowCatDropdown(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", borderRadius: 8,
                          cursor: "pointer", fontSize: "0.88rem",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span
                          style={{
                            width: 10, height: 10, borderRadius: "50%",
                            background: cat.color, flexShrink: 0,
                          }}
                        />
                        {cat.name}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      No more categories
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">
            <Star
              size={14}
              style={{ marginRight: 4 }}
            />

            IMDb Rating (0 - 10)
          </label>

          <input
            className="form-input-styled"
            name="rating"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="8.5"
            onChange={ch}
            value={form.rating}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <ArrowUpCircle
              size={14}
              style={{ marginRight: 4 }}
            />

            Priority (0 = Auto-assign)
          </label>

          <input
            className="form-input-styled"
            name="priority"
            type="number"
            min="0"
            placeholder="0 = Automatic (bottom), manually enter 1, 2, 3... to rank"
            onChange={ch}
            value={form.priority}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 24,
        }}
      >
        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            cursor: "pointer",
            background: form.isComingSoon ? "rgba(255, 152, 0, 0.1)" : "var(--bg3)",
            borderColor: form.isComingSoon ? "rgba(255, 152, 0, 0.2)" : "var(--border)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
            style={{ display: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: form.isComingSoon ? "#ff9800" : "var(--text)" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Rocket size={16} style={{ marginRight: 8 }} />
              Coming Soon
            </span>
            {form.isComingSoon ? <ToggleRight size={24} /> : <ToggleLeft size={24} color="var(--text-muted)" />}
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            cursor: "pointer",
            background: form.isPremium ? "rgba(229, 9, 20, 0.1)" : "var(--bg3)",
            borderColor: form.isPremium ? "rgba(229, 9, 20, 0.2)" : "var(--border)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
            style={{ display: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: form.isPremium ? "var(--primary)" : "var(--text)" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Lock size={16} style={{ marginRight: 8 }} />
              Premium Content
            </span>
            {form.isPremium ? <ToggleRight size={24} /> : <ToggleLeft size={24} color="var(--text-muted)" />}
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            cursor: "pointer",
            background: form.isPublished ? "rgba(16, 185, 129, 0.1)" : "rgba(220, 38, 38, 0.1)",
            borderColor: form.isPublished ? "rgba(16, 185, 129, 0.2)" : "rgba(220, 38, 38, 0.2)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="isPublished"
            onChange={ch}
            checked={form.isPublished}
            style={{ display: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: form.isPublished ? "#10b981" : "var(--red)" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              {form.isPublished ? (
                <CheckCircle size={16} style={{ marginRight: 8 }} />
              ) : (
                <XCircle size={16} style={{ marginRight: 8 }} />
              )}
              {form.isPublished ? "Published" : "Draft (Unpublished)"}
            </span>
            {form.isPublished ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </span>
        </label>
      </div>

      {form.isComingSoon && (
        <div
          className="form-row"
          style={{
            marginTop: 20,
            animation: "pageIn 0.3s ease",
          }}
        >
          <label className="form-label">
            Scheduled Release Date & Time
          </label>

          <input
            className="form-input-styled"
            type="datetime-local"
            name="releaseDate"
            onChange={ch}
            value={form.releaseDate}
            required
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}