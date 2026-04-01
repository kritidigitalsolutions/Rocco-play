import { useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import { Plus, Star, Image, Palette, Film, Tv, Users, X, Upload, Play, Rocket, Lock, AlertCircle } from "lucide-react";

const EMPTY_FORM = {
  title: "", description: "", type: "movie", language: "",
  releaseYear: "", duration: "", genre: "", category: "",
  rating: "", videoUrl: "", trailerUrl: "", poster: "", banner: "",
  isPremium: false,
  isComingSoon: false,
releaseDate: "",
  cast: [{ name: "", image: "" }],
  seasons: [],
};

export default function AddContent() {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [trailerFile, setTrailerFile] = useState(null);
  const [episodeVideoFiles, setEpisodeVideoFiles] = useState({});

  const ch = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Video file selected:", file.name);
      setVideoFile(file);
    }
  };

  const handlePosterFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Poster file selected:", file.name);
      setPosterFile(file);
    }
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Banner file selected:", file.name);
      setBannerFile(file);
    }
  };

  const handleTrailerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Trailer file selected:", file.name);
      setTrailerFile(file);
    }
  };

  const handleEpisodeVideoChange = (seasonIndex, episodeIndex, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = `${seasonIndex}_${episodeIndex}`;
      console.log(`Episode video selected for S${seasonIndex + 1}E${episodeIndex + 1}:`, file.name);
      setEpisodeVideoFiles(prev => ({
        ...prev,
        [key]: file
      }));
    }
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
      if (form.type === "movie") {
        // If any file is selected, send as FormData
        if (videoFile || posterFile || bannerFile || trailerFile) {
          const formData = new FormData();
          formData.append("title", form.title);
          formData.append("description", form.description);
          formData.append("language", form.language);
          formData.append("releaseYear", Number(form.releaseYear));
          formData.append("duration", form.duration);
          formData.append("genre", JSON.stringify(form.genre.split(",").map(s => s.trim()).filter(Boolean)));
          formData.append("category", JSON.stringify(form.category.split(",").map(s => s.trim()).filter(Boolean)));
          formData.append("rating", Number(form.rating));
          formData.append("isPremium", form.isPremium);
          formData.append("isComingSoon", form.isComingSoon);
formData.append("releaseDate", form.releaseDate);
          // Add poster - file takes precedence over URL
          if (posterFile) {
            formData.append("poster", posterFile);
          } else if (form.poster) {
            formData.append("poster", form.poster);
          }
          
          // Add banner - file takes precedence over URL
          if (bannerFile) {
            formData.append("banner", bannerFile);
          } else if (form.banner) {
            formData.append("banner", form.banner);
          }
          
          // Add trailer - file takes precedence over URL
          if (trailerFile) {
            formData.append("trailer", trailerFile);
          } else if (form.trailerUrl) {
            formData.append("trailerUrl", form.trailerUrl);
          }
          
          formData.append("cast", JSON.stringify(form.cast));
          
          // Add video if file is selected
          if (videoFile) {
            formData.append("video", videoFile);
          } else if (form.videoUrl) {
            formData.append("videoUrl", form.videoUrl);
          }
          
          await API.post("/movies/add", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
        } else {
          // Send as JSON if only URL provided
          const payload = {
            ...form,
            releaseYear: Number(form.releaseYear),
            rating: Number(form.rating),
            isComingSoon: form.isComingSoon,
releaseDate: form.releaseDate,
            genre: form.genre.split(",").map(s => s.trim()).filter(Boolean),
            category: form.category.split(",").map(s => s.trim()).filter(Boolean),
            videoUrl: form.videoUrl,
            seasons: [],
          };
          await API.post("/movies/add", payload);
        }
      } else if (form.type === "series") {
        // Create series first - with FormData if files are provided
        let seriesId;

        if (posterFile || bannerFile || trailerFile) {
          const formData = new FormData();
          formData.append("title", form.title);
          formData.append("description", form.description);
          formData.append("language", form.language);
          formData.append("releaseYear", Number(form.releaseYear));
          formData.append("duration", form.duration);
          formData.append("genre", JSON.stringify(form.genre.split(",").map(s => s.trim()).filter(Boolean)));
          formData.append("category", JSON.stringify(form.category.split(",").map(s => s.trim()).filter(Boolean)));
          formData.append("rating", Number(form.rating));
          formData.append("isPremium", form.isPremium);
          formData.append("isComingSoon", form.isComingSoon);
formData.append("releaseDate", form.releaseDate);
          // Add poster - file takes precedence over URL
          if (posterFile) {
            formData.append("poster", posterFile);
          } else if (form.poster) {
            formData.append("poster", form.poster);
          }
          
          // Add banner - file takes precedence over URL
          if (bannerFile) {
            formData.append("banner", bannerFile);
          } else if (form.banner) {
            formData.append("banner", form.banner);
          }
          
          // Add trailer - file takes precedence over URL
          if (trailerFile) {
            formData.append("trailer", trailerFile);
          } else if (form.trailerUrl) {
            formData.append("trailerUrl", form.trailerUrl);
          }
          
          formData.append("cast", JSON.stringify(form.cast));
          
          const seriesResponse = await API.post("/series", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          seriesId = seriesResponse.data.data._id;
        } else {
          const seriesPayload = {
            title: form.title,
            description: form.description,
            language: form.language,
            releaseYear: Number(form.releaseYear),
            duration: form.duration,
            genre: form.genre.split(",").map(s => s.trim()).filter(Boolean),
            category: form.category.split(",").map(s => s.trim()).filter(Boolean),
            rating: Number(form.rating),
            isPremium: form.isPremium,
            isComingSoon: form.isComingSoon,
releaseDate: form.releaseDate,
            poster: form.poster,
            banner: form.banner,
            trailerUrl: form.trailerUrl,
            cast: form.cast,
            totalSeasons: form.seasons.length,
          };
          const seriesResponse = await API.post("/series", seriesPayload);
          seriesId = seriesResponse.data.data._id;
        }

        // Add episodes
        for (const season of form.seasons) {
          let episodeNumber = 1;
          for (const ep of season.episodes) {
            const episodeKey = `${form.seasons.indexOf(season)}_${season.episodes.indexOf(ep)}`;
            const episodeFile = episodeVideoFiles[episodeKey];

            if (episodeFile) {
              const episodeFormData = new FormData();
              episodeFormData.append("title", ep.title);
              episodeFormData.append("duration", ep.duration);
              episodeFormData.append("seriesId", seriesId);
              episodeFormData.append("seasonNumber", season.seasonNumber);
              episodeFormData.append("episodeNumber", episodeNumber);
              episodeFormData.append("video", episodeFile);

              await API.post("/episodes", episodeFormData, {
                headers: { "Content-Type": "multipart/form-data" }
              });
            } else if (ep.videoUrl) {
              const episodePayload = {
                title: ep.title,
                videoUrl: ep.videoUrl,
                duration: ep.duration,
                seriesId,
                seasonNumber: season.seasonNumber,
                episodeNumber,
              };
              await API.post("/episodes", episodePayload);
            }
            episodeNumber++;
          }
        }
      }
      alert("Content published successfully!");
      setForm(EMPTY_FORM);
      setVideoFile(null);
      setPosterFile(null);
      setBannerFile(null);
      setTrailerFile(null);
      setEpisodeVideoFiles({});
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
          <h1 className="pg-title"><Plus size={18} style={{ display: "inline-block", marginRight: 8 }} /> Add New Content</h1>
          <p className="pg-sub">Publish a movie or series to the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Basic Info */}
        <div className="form-card">
          <h3><Star size={18} style={{ display: "inline-block", marginRight: 6 }} /> Basic Info</h3>
          <div className="form-2col">
            <input className="form-input-styled form-full" name="title" placeholder="Title *" onChange={ch} value={form.title} required />
            <textarea className="form-input-styled form-full" name="description" placeholder="Description / Synopsis *" rows={3} onChange={ch} value={form.description} required />

            <select className="form-input-styled" name="type" onChange={ch} value={form.type}>
              <option value="movie">Movie</option>
              <option value="series">Series</option>
            </select>
            <input className="form-input-styled" name="language" placeholder="Language (e.g. English)" onChange={ch} value={form.language} />
            <input className="form-input-styled" name="releaseYear" placeholder="Release Year" type="number" onChange={ch} value={form.releaseYear} />
            <input className="form-input-styled" name="duration"    placeholder="Duration (e.g. 2h 15m)" onChange={ch} value={form.duration} />
            <input className="form-input-styled" name="genre"       placeholder="Genres: Action, Drama" onChange={ch} value={form.genre} />
            <input className="form-input-styled" name="category"    placeholder="Category: trending, top10" onChange={ch} value={form.category} />
            <input className="form-input-styled" name="rating"      placeholder="Rating (e.g. 8.5)" type="number" step="0.1" onChange={ch} value={form.rating} />
          </div>

{/* ✅ FIXED Coming Soon + Premium */}

<div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>

  {/* 🚀 Coming Soon */}
  <label className="checkbox-row">
    <input
      type="checkbox"
      name="isComingSoon"
      onChange={ch}
      checked={form.isComingSoon}
    />
    <span>🚀 Coming Soon</span>
  </label>

  {/* 🔒 Premium */}
  <label className="checkbox-row">
    <input
      type="checkbox"
      name="isPremium"
      onChange={ch}
      checked={form.isPremium}
    />
    <span>
      <Lock size={16} style={{ marginRight: 6 }} />
      Premium-only Content
    </span>
  </label>

</div>

{/* 📅 DATE INPUT */}
{form.isComingSoon && (
  <div style={{ marginTop: 10 }}>

    <input
      className="form-input-styled"
      type="date"
      name="releaseDate"
      onChange={ch}
      value={form.releaseDate}
      required
    />

    {form.releaseDate && (
      <p style={{ marginTop: 5, color: "#aaa" }}>
        📅 Selected: {new Date(form.releaseDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric"
        })}
      </p>
    )}

  </div>
)}
        </div>

        {/* Media URLs */}
        <div className="form-card">
          <h3><Image size={18} style={{ display: "inline-block", marginRight: 6 }} /> Media Assets</h3>
          
          {/* Poster Section */}
          <div className="form-2col">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}><Upload size={16} style={{ display: "inline-block", marginRight: 6 }} /> Poster Image</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePosterFileChange}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", flex: 1 }} 
                />
                {posterFile && <small style={{ color: "var(--green)", whiteSpace: "nowrap" }}>✓ {posterFile.name}</small>}
              </div>
            </div>
            <input className="form-input-styled" name="poster" placeholder="OR paste Poster URL (vertical)" onChange={ch} value={form.poster} disabled={posterFile ? true : false} />
          </div>

          {/* Banner Section */}
          <div className="form-2col" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}><Palette size={16} style={{ display: "inline-block", marginRight: 6 }} /> Banner Image</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBannerFileChange}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", flex: 1 }} 
                />
                {bannerFile && <small style={{ color: "var(--green)", whiteSpace: "nowrap" }}>✓ {bannerFile.name}</small>}
              </div>
            </div>
            <input className="form-input-styled" name="banner" placeholder="OR paste Banner URL (horizontal)" onChange={ch} value={form.banner} disabled={bannerFile ? true : false} />
          </div>

          {/* Trailer Section */}
          <div className="form-2col" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}><Film size={16} style={{ display: "inline-block", marginRight: 6 }} /> Trailer Video</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleTrailerFileChange}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", flex: 1 }} 
                />
                {trailerFile && <small style={{ color: "var(--green)", whiteSpace: "nowrap" }}>✓ {trailerFile.name}</small>}
              </div>
            </div>
            <input className="form-input-styled" name="trailerUrl" placeholder="OR paste Trailer URL" onChange={ch} value={form.trailerUrl} disabled={trailerFile ? true : false} />
          </div>

          {/* Movie Video Section */}
          {form.type === "movie" && !form.isComingSoon && (
            <div className="form-2col" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}><Play size={16} style={{ display: "inline-block", marginRight: 6 }} /> Movie Video</label>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleVideoFileChange}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)" }} 
                />
                {videoFile && <small style={{ color: "var(--green)", marginTop: 4 }}>✓ {videoFile.name}</small>}
              </div>
              <input className="form-input-styled" name="videoUrl" placeholder="OR paste Video URL" onChange={ch} value={form.videoUrl} disabled={videoFile ? true : false} />
            </div>
          )}
        </div>

        {/* Cast */}
        <div className="form-card">
          <h3><Users size={18} style={{ display: "inline-block", marginRight: 6 }} /> Cast Members</h3>
          {form.cast.map((c, i) => (
            <div key={i} className="cast-row-grid">
              <input className="form-input-styled" placeholder="Actor name" value={c.name}  onChange={e => chCast(i, "name",  e.target.value)} />
              <input className="form-input-styled" placeholder="Photo URL"  value={c.image} onChange={e => chCast(i, "image", e.target.value)} />
              <button type="button" className="btn-sq" onClick={() => removeCast(i)}><X size={18} /></button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={addCast}>+ Add Actor</button>
        </div>

        {/* Series */}
        {form.type === "series" && !form.isComingSoon && (
          <div className="form-card">
            <h3><Tv size={18} style={{ display: "inline-block", marginRight: 6 }} /> Seasons & Episodes</h3>
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                      <input 
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleEpisodeVideoChange(si, ei, e)}
                        style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", flex: 1 }}
                      />
                      {episodeVideoFiles[`${si}_${ei}`] && <small style={{ color: "var(--green)", whiteSpace: "nowrap" }}>✓ {episodeVideoFiles[`${si}_${ei}`].name}</small>}
                    </div>
                    <input className="form-input-styled" placeholder="OR Video URL" value={ep.videoUrl} onChange={e => chEp(si, ei, "videoUrl", e.target.value)} disabled={episodeVideoFiles[`${si}_${ei}`] ? true : false} />
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
            {loading ? "Publishing..." : <><Rocket size={16} style={{ display: "inline-block", marginRight: 6 }} /> Publish to Platform</>}
          </button>
        </div>
      </form>
    </div>
  );
}