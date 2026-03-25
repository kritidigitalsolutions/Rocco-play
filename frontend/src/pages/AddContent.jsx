import { useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";

const EMPTY_FORM = {
  title: "", description: "", type: "movie", language: "",
  releaseYear: "", duration: "", genre: "", category: "",
  rating: "", videoUrl: "", trailerUrl: "", poster: "", banner: "",
  isPremium: false,
  cast: [{ name: "", image: "" }],
  seasons: [],
};

export default function AddContent() {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const ch = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const addCast    = () => setForm(f => ({ ...f, cast: [...f.cast, { name: "", image: "" }] }));
  const removeCast = (i) => setForm(f => ({ ...f, cast: f.cast.filter((_, j) => j !== i) }));

  const chCast = (i, field, val) => {
    setForm(f => {
      const cast = [...f.cast];
      cast[i][field] = val;
      return { ...f, cast };
    });
  };

  const addSeason = () => setForm(f => ({
    ...f, seasons: [...f.seasons, { seasonNumber: f.seasons.length + 1, episodes: [] }]
  }));

  const addEp = (si) => setForm(f => {
    const seasons = [...f.seasons];
    seasons[si].episodes.push({ title: "", videoUrl: "", duration: "" });
    return { ...f, seasons };
  });

  const chEp = (si, ei, field, val) => setForm(f => {
    const seasons = [...f.seasons];
    seasons[si].episodes[ei][field] = val;
    return { ...f, seasons };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        releaseYear: Number(form.releaseYear),
        rating:      Number(form.rating),
        genre:    form.genre.split(",").map(s => s.trim()).filter(Boolean),
        category: form.category.split(",").map(s => s.trim()).filter(Boolean),
        videoUrl: form.type === "movie"  ? form.videoUrl : undefined,
        seasons:  form.type === "series" ? form.seasons  : [],
      };
      await API.post("/movies", payload);
      alert("Content published successfully! 🎬");
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      alert("Error adding content ❌");
    }
    setLoading(false);
  };

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">➕ Add New Content</h1>
          <p className="pg-sub">Publish a movie or series to the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Basic Info */}
        <div className="form-card">
          <h3>⭐ Basic Info</h3>
          <div className="form-2col">
            <input className="form-input-styled form-full" name="title" placeholder="Title *" onChange={ch} value={form.title} required />
            <textarea className="form-input-styled form-full" name="description" placeholder="Description / Synopsis *" rows={3} onChange={ch} value={form.description} required />

            <select className="form-input-styled" name="type" onChange={ch} value={form.type}>
              <option value="movie">🎬 Movie</option>
              <option value="series">📺 Series</option>
            </select>
            <input className="form-input-styled" name="language" placeholder="Language (e.g. English)" onChange={ch} value={form.language} />
            <input className="form-input-styled" name="releaseYear" placeholder="Release Year" type="number" onChange={ch} value={form.releaseYear} />
            <input className="form-input-styled" name="duration"    placeholder="Duration (e.g. 2h 15m)" onChange={ch} value={form.duration} />
            <input className="form-input-styled" name="genre"       placeholder="Genres: Action, Drama" onChange={ch} value={form.genre} />
            <input className="form-input-styled" name="category"    placeholder="Category: trending, top10" onChange={ch} value={form.category} />
            <input className="form-input-styled" name="rating"      placeholder="Rating (e.g. 8.5)" type="number" step="0.1" onChange={ch} value={form.rating} />
          </div>

          <label className="checkbox-row" style={{ marginTop: 16 }}>
            <input type="checkbox" name="isPremium" onChange={ch} checked={form.isPremium} />
            <span>🔒 Premium-only Content</span>
          </label>
        </div>

        {/* Media URLs */}
        <div className="form-card">
          <h3>🖼️ Media Assets</h3>
          <div className="form-2col">
            <input className="form-input-styled" name="poster"     placeholder="Poster Image URL (vertical)" onChange={ch} value={form.poster} />
            <input className="form-input-styled" name="banner"     placeholder="Banner Image URL (horizontal)" onChange={ch} value={form.banner} />
            <input className="form-input-styled" name="trailerUrl" placeholder="Trailer Video URL" onChange={ch} value={form.trailerUrl} />
            {form.type === "movie" && (
              <input className="form-input-styled" name="videoUrl" placeholder="Main Video URL" onChange={ch} value={form.videoUrl} />
            )}
          </div>
        </div>

        {/* Cast */}
        <div className="form-card">
          <h3>🎭 Cast Members</h3>
          {form.cast.map((c, i) => (
            <div key={i} className="cast-row-grid">
              <input className="form-input-styled" placeholder="Actor name" value={c.name}  onChange={e => chCast(i, "name",  e.target.value)} />
              <input className="form-input-styled" placeholder="Photo URL"  value={c.image} onChange={e => chCast(i, "image", e.target.value)} />
              <button type="button" className="btn-sq" onClick={() => removeCast(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={addCast}>+ Add Actor</button>
        </div>

        {/* Series */}
        {form.type === "series" && (
          <div className="form-card">
            <h3>📺 Seasons & Episodes</h3>
            {form.seasons.map((s, si) => (
              <div key={si} className="season-block">
                <input className="form-input-styled" placeholder={`Season ${si + 1} number`} value={s.seasonNumber}
                  onChange={e => {
                    const seasons = [...form.seasons];
                    seasons[si].seasonNumber = Number(e.target.value);
                    setForm(f => ({ ...f, seasons }));
                  }}
                  style={{ marginBottom: 10, width: 200 }}
                />
                {s.episodes.map((ep, ei) => (
                  <div key={ei} className="ep-row">
                    <input className="form-input-styled" placeholder="Ep title" value={ep.title}    onChange={e => chEp(si, ei, "title",    e.target.value)} />
                    <input className="form-input-styled" placeholder="Video URL" value={ep.videoUrl} onChange={e => chEp(si, ei, "videoUrl", e.target.value)} />
                    <input className="form-input-styled" placeholder="Duration"  value={ep.duration} onChange={e => chEp(si, ei, "duration", e.target.value)} />
                  </div>
                ))}
                <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => addEp(si)}>+ Episode</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={addSeason}>+ Add Season</button>
          </div>
        )}

        {/* Submit */}
        <div className="submit-row">
          <button type="submit" className="btn-lg" disabled={loading}>
            {loading ? "Publishing..." : "🚀 Publish to Platform"}
          </button>
        </div>
      </form>
    </div>
  );
}