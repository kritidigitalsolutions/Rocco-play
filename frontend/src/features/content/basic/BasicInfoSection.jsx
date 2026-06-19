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
} from "lucide-react";

export default function BasicInfoSection({
  form,
  ch,
}) {
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

        <div className="form-row">
          <label className="form-label">
            <Layers
              size={14}
              style={{ marginRight: 4 }}
            />

            Category
          </label>

          <select
            className="form-input-styled"
            name="category"
            onChange={ch}
            value={form.category}
          >
            <option value="">
              Select Category
            </option>

            <option value="trending">
              Trending
            </option>

            <option value="top10">
              Top 10
            </option>

            <option value="recommended">
              Recommended
            </option>
          </select>
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
          }}
        >
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
          />

          <span>
            <Rocket
              size={16}
              style={{ marginRight: 8 }}
            />

            Coming Soon
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            background:
              "rgba(229, 9, 20, 0.1)",
            borderColor:
              "rgba(229, 9, 20, 0.2)",
          }}
        >
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
          />

          <span
            style={{
              color: "var(--primary)",
            }}
          >
            <Lock
              size={16}
              style={{ marginRight: 8 }}
            />

            Premium Content
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
            Scheduled Release Date
          </label>

          <input
            className="form-input-styled"
            type="date"
            name="releaseDate"
            onChange={ch}
            value={form.releaseDate}
            required
          />
        </div>
      )}
    </div>
  );
}