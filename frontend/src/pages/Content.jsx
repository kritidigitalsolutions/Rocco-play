import { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import "./Content.css";
import {
  Eye, Edit2, Upload, Trash2, X, Play, Film, Tv,
  Search, Plus, ChevronDown, ChevronRight, User, Calendar, Video
} from "lucide-react";

export default function Content() {
  const [contentType, setContentType] = useState("movies");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [isSearching, setIsSearching] = useState(false);

  const [selectedSeries, setSelectedSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [collapsedSeasons, setCollapsedSeasons] = useState({});

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [editData, setEditData] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [uploadData, setUploadData] = useState({
    poster: null, banner: null, trailer: null, video: null
  });
  const [castFiles, setCastFiles] = useState({}); // { index: File }

  // Add season/episode forms
  const [showAddEpisodeForm, setShowAddEpisodeForm] = useState(null); // seasonNumber
  const [newEpisode, setNewEpisode] = useState({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" });
  const [newEpisodeVideo, setNewEpisodeVideo] = useState(null);
  const [showAddSeasonForm, setShowAddSeasonForm] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState("");
  const [addingEpisode, setAddingEpisode] = useState(false);

  const videoRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchData();
    setSearchQuery("");
    setSearchResults(null);
  }, [contentType]);

  /* ===================== LOCK LOGIC ===================== */
  const isLocked = (item) => {
    // if (!item.isComingSoon) return false;
    if (!item.releaseDate) return false;
    return new Date(item.releaseDate) > new Date();
  };

  // Coming-soon: view & edit allowed, but video upload locked (trailer OK)
  const isVideoUploadLocked = (item) => isLocked(item);

  /* ===================== DATA FETCH ===================== */
  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = contentType === "movies" ? "/movies?admin=true" : "/series?admin=true";
      const res = await API.get(endpoint);
      setData(res.data.data || []);
      setSelectedSeries(null);
      setEpisodes([]);
    } catch (err) {
      console.error(err);
      setData([]);
    }
    setLoading(false);
  };

  const fetchEpisodes = async (seriesId) => {
    try {
      const res = await API.get(`/episodes?seriesId=${seriesId}`);
      const eps = res.data.data || [];
      setEpisodes(eps);

      // Auto-sync series totalSeasons locally to reflect in UI instantly
      const maxS = eps.length > 0 ? Math.max(...eps.map(e => e.seasonNumber)) : 0;
      setSelectedSeries(prev => prev ? { ...prev, totalSeasons: Math.max(prev.totalSeasons || 0, maxS) } : prev);
      setData(prevData => prevData.map(s => s._id === seriesId ? { ...s, totalSeasons: Math.max(s.totalSeasons || 0, maxS) } : s));
      setSearchResults(prev => prev ? prev.map(s => s._id === seriesId ? { ...s, totalSeasons: Math.max(s.totalSeasons || 0, maxS) } : s) : prev);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  };

  /* ===================== SEARCH ===================== */
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimeout.current = setTimeout(() => doSearch(q.trim()), 400);
  };

  const doSearch = async (q) => {
    setIsSearching(true);
    try {
      const endpoint = contentType === "movies" ? `/movies/search?q=${encodeURIComponent(q)}` : `/series/search?q=${encodeURIComponent(q)}`;
      const res = await API.get(endpoint);
      setSearchResults(res.data.data || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const displayData = searchResults !== null ? searchResults : data;

  /* ===================== SERIES / EPISODES ===================== */
  const handleSeriesClick = (series) => {
    setSelectedSeries(series);
    fetchEpisodes(series._id);
    setCollapsedSeasons({});
    setEpisodeSearchQuery("");
  };

  const groupEpisodesBySeason = () => {
    const grouped = {};
    const filteredEpisodes = episodeSearchQuery.trim()
      ? episodes.filter(ep =>
        ep.title.toLowerCase().includes(episodeSearchQuery.toLowerCase()) ||
        ep.seasonNumber.toString() === episodeSearchQuery.trim() ||
        ep.episodeNumber.toString() === episodeSearchQuery.trim()
      )
      : episodes;

    filteredEpisodes.forEach(ep => {
      if (!grouped[ep.seasonNumber]) grouped[ep.seasonNumber] = [];
      grouped[ep.seasonNumber].push(ep);
    });
    return grouped;
  };

  const toggleSeason = (seasonNum) => {
    setCollapsedSeasons(prev => ({ ...prev, [seasonNum]: !prev[seasonNum] }));
  };

  /* ===================== ADD EPISODE ===================== */
  const handleAddEpisode = async (seasonNumber) => {
    const epData = showAddEpisodeForm === "new-season"
      ? { ...newEpisode, seasonNumber: Number(newSeasonNumber) }
      : { ...newEpisode, seasonNumber: Number(seasonNumber) };

    if (!epData.title || !epData.episodeNumber || !epData.seasonNumber) {
      alert("Title, Episode Number, and Season Number are required");
      return;
    }
    setAddingEpisode(true);
    try {
      const formData = new FormData();
      formData.append("seriesId", selectedSeries._id);
      formData.append("title", epData.title);
      formData.append("episodeNumber", epData.episodeNumber);
      formData.append("seasonNumber", epData.seasonNumber);
      formData.append("duration", epData.duration || "");
      formData.append("description", epData.description || "");
      if (newEpisodeVideo) formData.append("video", newEpisodeVideo);

      await API.post("/episodes", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Episode added successfully!");
      setShowAddEpisodeForm(null);
      setShowAddSeasonForm(false);
      setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" });
      setNewSeasonNumber("");
      setNewEpisodeVideo(null);
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
    setAddingEpisode(false);
  };

  /* ===================== DELETE SEASON ===================== */
  const handleDeleteSeason = async (seasonNumber) => {
    const confirmed = window.confirm(`Delete ALL episodes in Season ${seasonNumber}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await API.delete(`/episodes/season/${selectedSeries._id}/${seasonNumber}`);
      alert(`Season ${seasonNumber} deleted`);
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Failed to delete season: " + (err.response?.data?.message || err.message));
    }
  };

  /* ===================== MODALS ===================== */
  const openView = (item) => { setSelectedItem(item); setModalMode("view"); setEditData(null); };
  const openEdit = (item) => {
    setEditData({ ...item, cast: item.cast ? [...item.cast.map(c => ({ ...c }))] : [] });
    setSelectedItem(item);
    setModalMode("edit");
    setCastFiles({});
  };
  const closeModal = () => {
    setSelectedItem(null); setModalMode(null); setEditData(null);
    setSelectedEpisode(null);
    setUploadData({ poster: null, banner: null, trailer: null, video: null });
    setCastFiles({});
  };

  const openEpisodePlayer = (episode) => {
    setSelectedEpisode(episode); setSelectedItem(episode); setModalMode("episode-view");
  };
  const openUpload = (item, isEpisode = false) => {
    setSelectedItem(item);
    setSelectedEpisode(isEpisode ? item : null);
    setModalMode("upload");
    setUploadData({ poster: null, banner: null, trailer: null, video: null });
  };
  const openEpisodeEdit = (episode) => {
    setEditData({ ...episode }); setSelectedItem(episode);
    setSelectedEpisode(episode); setModalMode("episode-edit");
  };

  /* ===================== UPLOAD ===================== */
  const handleUploadChange = (field, file) => {
    setUploadData(prev => ({ ...prev, [field]: file }));
  };

  const handleUpload = async () => {
    if (selectedEpisode && !uploadData.video) {
      alert("Please select a video file");
      return;
    }
    if (!selectedEpisode && !uploadData.poster && !uploadData.banner && !uploadData.trailer && !uploadData.video) {
      alert("Please select at least one file");
      return;
    }

    try {
      const formData = new FormData();
      if (selectedEpisode) {
        if (uploadData.video) formData.append("video", uploadData.video);
        await API.put(`/episodes/${selectedEpisode._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        alert("Episode video uploaded successfully");
        closeModal();
        fetchEpisodes(selectedSeries._id);
      } else {
        if (uploadData.poster) formData.append("poster", uploadData.poster);
        if (uploadData.banner) formData.append("banner", uploadData.banner);
        if (uploadData.trailer) formData.append("trailer", uploadData.trailer);
        if (uploadData.video) formData.append("video", uploadData.video);

        if (contentType === "movies") {
          await API.put(`/movies/slug/${selectedItem.slug}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await API.put(`/series/${selectedItem.slug}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        }
        alert("Upload successful");
        closeModal();
        fetchData();
      }
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.message || err.message));
    }
  };

  /* ===================== EDIT SAVE ===================== */
  const handleSave = async () => {
    if (!editData) return;
    try {
      const formData = new FormData();
      // Basic text fields
      const textFields = ["title", "description", "language", "duration", "rating", "releaseYear", "isPremium", "isComingSoon", "releaseDate", "totalSeasons"];
      textFields.forEach(k => {
        if (editData[k] !== undefined) formData.append(k, editData[k]);
      });
      if (editData.genre) formData.append("genre", JSON.stringify(editData.genre));
      if (editData.category) formData.append("category", JSON.stringify(editData.category));

      // Cast
      const castPayload = (editData.cast || []).map(c => ({ name: c.name, image: c.image || "" }));
      formData.append("cast", JSON.stringify(castPayload));
      // Cast image files
      Object.entries(castFiles).forEach(([idx, file]) => {
        formData.append(`castImage_${idx}`, file);
      });

      if (contentType === "movies") {
        await API.put(`/movies/slug/${selectedItem.slug}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await API.put(`/series/${selectedItem.slug}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      }
      alert("Saved successfully");
      closeModal();
      fetchData();
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEpisodeSave = async () => {
    if (!editData) return;
    try {
      await API.put(`/episodes/${selectedEpisode._id}`, editData);
      alert("Episode saved");
      closeModal();
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  };

  /* ===================== DELETE ===================== */
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete '${item.title || item.name}' permanently?`)) return;
    try {
      if (contentType === "movies") await API.delete(`/movies/slug/${item.slug}`);
      else await API.delete(`/series/${item.slug}`);
      alert("Deleted");
      fetchData();
      if (selectedSeries?._id === item._id) { setSelectedSeries(null); setEpisodes([]); }
      closeModal();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleEpisodeDelete = async (ep) => {
    if (!window.confirm(`Delete Ep ${ep.episodeNumber}: ${ep.title}?`)) return;
    try {
      await API.delete(`/episodes/${ep._id}`);
      alert("Episode deleted");
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ===================== PiP ===================== */
  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch (e) { console.error("PiP:", e); }
  };

  /* ===================== CAST HELPERS ===================== */
  const addCastMember = () => {
    setEditData(prev => ({ ...prev, cast: [...(prev.cast || []), { name: "", image: "" }] }));
  };
  const removeCastMember = (idx) => {
    setEditData(prev => ({ ...prev, cast: prev.cast.filter((_, i) => i !== idx) }));
    setCastFiles(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };
  const updateCastMember = (idx, field, value) => {
    setEditData(prev => ({
      ...prev,
      cast: prev.cast.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };
  const setCastImageFile = (idx, file) => {
    setCastFiles(prev => ({ ...prev, [idx]: file }));
    // Show local preview
    if (file) {
      const url = URL.createObjectURL(file);
      updateCastMember(idx, "_previewUrl", url);
    }
  };

  /* ===================== GROUPED SEASONS ===================== */
  const groupedEpisodes = groupEpisodesBySeason();
  const seasonNumbers = Object.keys(groupedEpisodes).map(Number).sort((a, b) => a - b);

  /* ===================== RENDER ===================== */
  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Film style={{ display: "inline-block", marginRight: 8 }} size={32} /> Content Management</h1>
          <p className="pg-sub">View and manage movies and series</p>
        </div>
      </div>

      <div className="content-box">
        {/* Type Selector + Search */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <button className={`btn ${contentType === "movies" ? "btn-primary" : "btn-ghost"}`} onClick={() => setContentType("movies")}>
            <Film size={18} style={{ marginRight: 6 }} /> Movies
          </button>
          <button className={`btn ${contentType === "series" ? "btn-primary" : "btn-ghost"}`} onClick={() => setContentType("series")}>
            <Tv size={18} style={{ marginRight: 6 }} /> Series
          </button>

          {/* Search bar */}
          <div className="search-bar" style={{ marginLeft: "auto" }}>
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder={`Search ${contentType}…`}
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button className="search-clear" onClick={clearSearch}><X size={14} /></button>
            )}
          </div>
        </div>

        {/* Search status */}
        {isSearching && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Searching…</p>}
        {searchResults !== null && !isSearching && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            <button className="link-btn" onClick={clearSearch} style={{ marginLeft: 8 }}>Clear</button>
          </p>
        )}

        {/* ========== MOVIES TABLE ========== */}
        {contentType === "movies" && (
          <div>
            <h3><Film size={20} style={{ display: "inline-block", marginRight: 8 }} /> Movies ({displayData.length})</h3>
            {loading ? <p>Loading…</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Genre</th><th>Year</th><th>Rating</th><th>Premium</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr><td colSpan={7}>No movies found</td></tr>
                    ) : displayData.map(movie => (
                      <tr key={movie._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={movie.poster} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{movie.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{movie.duration}</div>
                              {isLocked(movie) && (
                                <div style={{ fontSize: "0.75rem", color: "var(--orange)" }}>
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(movie.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{Array.isArray(movie.genre) ? movie.genre.join(", ") : movie.genre}</td>
                        <td>{movie.releaseYear}</td>
                        <td>{movie.rating}</td>
                        <td><span className={`badge ${movie.isPremium ? "badge-active" : "badge-draft"}`}>{movie.isPremium ? "Premium" : "Free"}</span></td>
                        <td>
                          <span className={`badge ${isLocked(movie) ? "badge-coming" : "badge-pub"}`}>
                            {isLocked(movie) ? "Coming Soon" : "Published"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            {/* View always allowed — coming-soon shows details + release date */}
                            <button className="icon-btn view" onClick={() => openView(movie)} title="View">
                              <Eye size={18} />
                            </button>
                            <button className="icon-btn edit" onClick={() => openEdit(movie)} title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button
                              className={`icon-btn upload ${isLocked(movie) ? "icon-btn-dim" : ""}`}
                              onClick={() => openUpload(movie)}
                              title={isLocked(movie) ? "Upload media (video locked until release)" : "Upload media"}
                            >
                              <Upload size={18} />
                            </button>
                            <button className="icon-btn del" onClick={() => handleDelete(movie)} title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========== SERIES TABLE ========== */}
        {contentType === "series" && !selectedSeries && (
          <div>
            <h3><Tv size={20} style={{ display: "inline-block", marginRight: 8 }} /> Series ({displayData.length})</h3>
            {loading ? <p>Loading…</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Genre</th><th>Year</th><th>Rating</th><th>Seasons</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr><td colSpan={7}>No series found</td></tr>
                    ) : displayData.map(series => (
                      <tr key={series._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={series.poster} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{series.title}</div>
                              {isLocked(series) && (
                                <div style={{ fontSize: "0.75rem", color: "var(--orange)" }}>
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(series.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{Array.isArray(series.genre) ? series.genre.join(", ") : series.genre}</td>
                        <td>{series.releaseYear}</td>
                        <td>{series.rating}</td>
                        <td>{series.totalSeasons}</td>
                        <td>
                          <span className={`badge ${isLocked(series) ? "badge-coming" : "badge-pub"}`}>
                            {isLocked(series) ? "Coming Soon" : "Published"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(series)} title="View">
                              <Eye size={18} />
                            </button>
                            <button className="icon-btn edit" onClick={() => openEdit(series)} title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button className="icon-btn upload" onClick={() => openUpload(series)} title="Upload">
                              <Upload size={18} />
                            </button>
                            <button className="icon-btn del" onClick={() => handleDelete(series)} title="Delete">
                              <Trash2 size={18} />
                            </button>
                            <button className="btn btn-ghost eps-btn" onClick={() => handleSeriesClick(series)}>
                              <Tv size={14} /> Episodes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========== EPISODES VIEW ========== */}
        {selectedSeries && (
          <div>
            {/* Series episodes header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={() => { setSelectedSeries(null); setEpisodes([]); }}>
                ← Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                {selectedSeries.poster && (
                  <img src={selectedSeries.poster} alt="" style={{ width: 36, height: 54, objectFit: "cover", borderRadius: 4 }} />
                )}
                <div>
                  <h3 style={{ margin: 0 }}><Tv size={20} style={{ display: "inline-block", marginRight: 8 }} />{selectedSeries.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{episodes.length} episodes across {seasonNumbers.length} seasons</p>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => { setShowAddSeasonForm(true); setShowAddEpisodeForm("new-season"); }}
                style={{ marginLeft: "auto" }}
              >
                <Plus size={16} /> Add Season
              </button>
            </div>

            {/* Episode Search */}
            <div style={{ marginBottom: 20 }}>
              <div className="search-bar" style={{ maxWidth: 400 }}>
                <Search size={16} className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search episodes by title, season #, or ep #..."
                  value={episodeSearchQuery}
                  onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                />
                {episodeSearchQuery && (
                  <button className="search-clear" onClick={() => setEpisodeSearchQuery("")}><X size={14} /></button>
                )}
              </div>
            </div>

            {/* Add new season form */}
            {showAddSeasonForm && showAddEpisodeForm === "new-season" && (
              <div className="add-form-card" style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 12, color: "var(--primary)" }}>
                  <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Add New Season &amp; First Episode
                </h4>
                <div className="form-grid-2">
                  <div className="form-row">
                    <label className="form-label">Season Number *</label>
                    <input className="form-input" type="number" min="1" value={newSeasonNumber} onChange={e => setNewSeasonNumber(e.target.value)} placeholder="e.g. 2" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Episode Number *</label>
                    <input className="form-input" type="number" min="1" value={newEpisode.episodeNumber} onChange={e => setNewEpisode(p => ({ ...p, episodeNumber: e.target.value }))} placeholder="e.g. 1" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Episode Title *</label>
                  <input className="form-input" value={newEpisode.title} onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))} placeholder="Episode title" />
                </div>
                <div className="form-grid-2">
                  <div className="form-row">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={newEpisode.duration} onChange={e => setNewEpisode(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 45m" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Episode Video (optional)</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="video/*" id="new-ep-video-new" className="file-input" onChange={e => setNewEpisodeVideo(e.target.files[0])} />
                      <label htmlFor="new-ep-video-new" className="file-label">
                        {newEpisodeVideo ? `✓ ${newEpisodeVideo.name}` : "Choose Video"}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="2" value={newEpisode.description} onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))} placeholder="Brief description…" />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => handleAddEpisode("new-season")} disabled={addingEpisode}>
                    {addingEpisode ? "Adding…" : <><Plus size={14} /> Add Season &amp; Episode</>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowAddSeasonForm(false); setShowAddEpisodeForm(null); setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" }); setNewSeasonNumber(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Seasons */}
            {seasonNumbers.length === 0 && !showAddSeasonForm && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <Tv size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <p>No episodes yet. Add the first season above.</p>
              </div>
            )}

            {seasonNumbers.map(seasonNum => (
              <div key={seasonNum} className="season-block">
                {/* Season header */}
                <div className="season-header">
                  <button className="season-toggle" onClick={() => toggleSeason(seasonNum)}>
                    {collapsedSeasons[seasonNum] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <span>Season {seasonNum}</span>
                    <span className="season-count">{groupedEpisodes[seasonNum].length} episodes</span>
                  </button>
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => { setShowAddEpisodeForm(seasonNum); setShowAddSeasonForm(false); setNewEpisode(p => ({ ...p, seasonNumber: seasonNum })); }}
                    >
                      <Plus size={14} /> Add Episode
                    </button>
                    <button
                      className="btn btn-ghost del-season-btn"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => handleDeleteSeason(seasonNum)}
                    >
                      <Trash2 size={14} /> Delete Season
                    </button>
                  </div>
                </div>

                {/* Add episode inline form for this season */}
                {showAddEpisodeForm === seasonNum && (
                  <div className="add-form-card add-form-nested">
                    <h4 style={{ marginBottom: 12 }}>Add Episode to Season {seasonNum}</h4>
                    <div className="form-grid-2">
                      <div className="form-row">
                        <label className="form-label">Episode Number *</label>
                        <input className="form-input" type="number" min="1" value={newEpisode.episodeNumber} onChange={e => setNewEpisode(p => ({ ...p, episodeNumber: e.target.value }))} placeholder="e.g. 3" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Title *</label>
                        <input className="form-input" value={newEpisode.title} onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))} placeholder="Episode title" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Duration</label>
                        <input className="form-input" value={newEpisode.duration} onChange={e => setNewEpisode(p => ({ ...p, duration: e.target.value }))} placeholder="45m" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Video (optional)</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id={`ep-video-s${seasonNum}`} className="file-input" onChange={e => setNewEpisodeVideo(e.target.files[0])} />
                          <label htmlFor={`ep-video-s${seasonNum}`} className="file-label">{newEpisodeVideo ? `✓ ${newEpisodeVideo.name}` : "Choose Video"}</label>
                        </div>
                      </div>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" rows="2" value={newEpisode.description} onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleAddEpisode(seasonNum)} disabled={addingEpisode}>
                        {addingEpisode ? "Adding…" : <><Plus size={14} /> Add Episode</>}
                      </button>
                      <button className="btn btn-ghost" onClick={() => { setShowAddEpisodeForm(null); setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" }); setNewEpisodeVideo(null); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Episodes table */}
                {!collapsedSeasons[seasonNum] && (
                  <div className="tbl-wrap" style={{ marginTop: 0 }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>Ep#</th>
                          <th>Title</th>
                          <th>Duration</th>
                          <th>Video</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedEpisodes[seasonNum]
                          .sort((a, b) => a.episodeNumber - b.episodeNumber)
                          .map(ep => (
                            <tr key={ep._id}>
                              <td style={{ fontWeight: 700, color: "var(--primary)" }}>E{ep.episodeNumber}</td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{ep.title}</div>
                                {ep.description && (
                                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {ep.description}
                                  </div>
                                )}
                              </td>
                              <td>{ep.duration}</td>
                              <td>
                                <span className={`badge ${ep.videoUrl ? "badge-pub" : "badge-draft"}`}>
                                  {ep.videoUrl ? "✓ Uploaded" : "No video"}
                                </span>
                              </td>
                              <td>
                                <div className="tbl-actions">
                                  <button className="icon-btn view" onClick={() => openEpisodePlayer(ep)} title="View & Play">
                                    <Eye size={16} />
                                  </button>
                                  {ep.videoUrl && (
                                    <button className="icon-btn" style={{ color: "var(--green)" }} onClick={() => openEpisodePlayer(ep)} title="Play Episode">
                                      <Play size={16} />
                                    </button>
                                  )}
                                  <button className="icon-btn edit" onClick={() => openEpisodeEdit(ep)} title="Edit">
                                    <Edit2 size={16} />
                                  </button>
                                  <button className="icon-btn upload" onClick={() => openUpload(ep, true)} title="Upload Video">
                                    <Upload size={16} />
                                  </button>
                                  <button className="icon-btn del" onClick={() => handleEpisodeDelete(ep)} title="Delete">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}
      {(modalMode === "view" || modalMode === "edit" || modalMode === "upload" || modalMode === "episode-view" || modalMode === "episode-edit") && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal-box ${(modalMode === "view" || modalMode === "episode-view") ? "modal-box-view" : "modal-box-form"}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3>
                {modalMode === "view" ? "Content Details" :
                  modalMode === "edit" ? "Edit Content" :
                    modalMode === "episode-edit" ? "Edit Episode" :
                      modalMode === "upload" && selectedEpisode ? "Upload Episode Video" :
                        modalMode === "upload" ? "Upload Media" :
                          "Episode Details"}
              </h3>
              <button className="modal-close" onClick={closeModal}><X size={24} /></button>
            </div>

            <div className="modal-body">

              {/* ---- EPISODE VIEW / PLAY ---- */}
              {modalMode === "episode-view" && (
                <div className="view-content">
                  <div className="view-banner">
                    <img src={selectedSeries?.poster || selectedSeries?.banner} alt="Banner" className="banner-image" />
                    <div className="banner-overlay">
                      <h2>S{selectedEpisode?.seasonNumber} E{selectedEpisode?.episodeNumber}: {selectedEpisode?.title}</h2>
                    </div>
                  </div>

                  {selectedEpisode?.videoUrl ? (
                    <div className="view-video-section">
                      <video ref={videoRef} controls className="view-video-player" src={selectedEpisode.videoUrl}>
                        Your browser does not support the video tag.
                      </video>
                      <button className="btn btn-primary pip-btn" onClick={handlePiP}>
                        <Tv size={18} style={{ marginRight: 6 }} /> PiP
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: "20px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--text-muted)" }}>
                      <Video size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <p>No video uploaded yet</p>
                      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { closeModal(); openUpload(selectedEpisode, true); }}>
                        <Upload size={14} style={{ marginRight: 6 }} /> Upload Video
                      </button>
                    </div>
                  )}

                  <div className="view-details">
                    <div className="detail-item"><strong>Series</strong><span>{selectedSeries?.title}</span></div>
                    <div className="detail-item"><strong>Season</strong><span>{selectedEpisode?.seasonNumber}</span></div>
                    <div className="detail-item"><strong>Episode</strong><span>{selectedEpisode?.episodeNumber}</span></div>
                    <div className="detail-item"><strong>Duration</strong><span>{selectedEpisode?.duration || "—"}</span></div>
                    {selectedEpisode?.description && (
                      <div className="detail-full"><strong>Description</strong><p>{selectedEpisode.description}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* ---- VIEW ---- */}
              {modalMode === "view" && (
                <div className="view-content">
                  <div className="view-banner">
                    <img src={selectedItem.poster || selectedItem.banner} alt="Banner" className="banner-image" />
                    <div className="banner-overlay">
                      <h2>
                        {selectedItem.title}
                        {isLocked(selectedItem) && (
                          <span className="badge badge-coming" style={{ fontSize: "0.7rem", marginLeft: 10, verticalAlign: "middle" }}>Coming Soon</span>
                        )}
                      </h2>
                    </div>
                  </div>

                  {/* Release date for coming-soon */}
                  {isLocked(selectedItem) && (
                    <div className="coming-soon-banner">
                      <Calendar size={18} style={{ marginRight: 8 }} />
                      <div>
                        <strong>Coming Soon</strong>
                        <p>Available from {new Date(selectedItem.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                    </div>
                  )}

                  {/* Trailer */}
                  {selectedItem.trailerUrl ? (
                    <div className="view-video-section">
                      <div style={{ padding: "10px 14px 0" }}>
                        <h4 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                          <Film size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> TRAILER
                        </h4>
                      </div>
                      <video controls className="view-video-player" src={selectedItem.trailerUrl}>
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <div style={{ padding: "20px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--text-muted)" }}>
                      <Video size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <p>Trailer not available</p>
                    </div>
                  )}

                  {/* Movie video (not shown if coming soon) */}
                  {/* {contentType === "movies" && !isLocked(selectedItem) && (
                    selectedItem.videoUrl ? (
                      <div className="view-video-section">
                        <div style={{ padding: "10px 14px 0" }}>
                          <h4 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                            <Film size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> FULL MOVIE
                          </h4>
                        </div>
                        <video ref={videoRef} controls className="view-video-player" src={selectedItem.videoUrl}>
                          Your browser does not support the video tag.
                        </video>
                        <button className="btn btn-primary pip-btn" onClick={handlePiP}><Tv size={18} style={{ marginRight: 6 }} /> PiP</button>
                      </div>
                    ) : (
                      <div style={{ padding: "20px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--text-muted)" }}>
                        <Video size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                        <p>Movie video not available</p>
                      </div>
                    )
                  )} */}
                  {contentType === "movies" && !isLocked(selectedItem) && (
                    <div className="view-video-section">

                      <div style={{ padding: "10px 14px 0" }}>
                        <h4>🎬 FULL MOVIE</h4>
                      </div>

                      {(selectedItem.videoUrl || selectedItem.video) ? (
                        <>
                          <video
                            ref={videoRef}
                            controls
                            className="view-video-player"
                            src={selectedItem.videoUrl || selectedItem.video}
                          />
                          <button className="btn btn-primary pip-btn" onClick={handlePiP}>
                            PiP
                          </button>
                        </>
                      ) : (
                        <div style={{ padding: "20px", textAlign: "center" }}>
                          No video available
                        </div>
                      )}

                    </div>
                  )}

                  <div className="view-details">
                    <div className="detail-item"><strong>Release Year</strong><span>{selectedItem.releaseYear}</span></div>
                    <div className="detail-item"><strong>Genre</strong><span>{selectedItem.genre?.join(", ")}</span></div>
                    <div className="detail-item"><strong>Rating</strong><span>{selectedItem.rating} ⭐</span></div>
                    <div className="detail-item"><strong>Duration</strong><span>{selectedItem.duration}</span></div>
                    <div className="detail-item"><strong>Premium</strong><span>{selectedItem.isPremium ? "✓ Yes" : "✗ No"}</span></div>
                    {contentType === "series" && (
                      <div className="detail-item"><strong>Total Seasons</strong><span>{selectedItem.totalSeasons}</span></div>
                    )}
                    {selectedItem.releaseDate && (
                      <div className="detail-item"><strong>Release Date</strong><span>{new Date(selectedItem.releaseDate).toLocaleDateString()}</span></div>
                    )}
                    {selectedItem.description && (
                      <div className="detail-full"><strong>Description</strong><p>{selectedItem.description}</p></div>
                    )}
                    {/* Cast */}
                    {selectedItem.cast?.length > 0 && (
                      <div className="detail-full">
                        <strong>Cast</strong>
                        <div className="cast-grid">
                          {selectedItem.cast.map((c, i) => (
                            <div key={i} className="cast-card-view">
                              {c.image && <img src={c.image} alt={c.name} className="cast-img-view" />}
                              <span>{c.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---- UPLOAD ---- */}
              {modalMode === "upload" && (
                <div className="upload-form">
                  <div className="upload-info">
                    <p>
                      {selectedEpisode
                        ? `Upload video for: S${selectedEpisode.seasonNumber} E${selectedEpisode.episodeNumber}: ${selectedEpisode.title}`
                        : `Upload media for: ${selectedItem.title}`}
                    </p>
                    {!selectedEpisode && isLocked(selectedItem) && (
                      <p style={{ color: "var(--orange)", marginTop: 6, fontSize: "0.85rem" }}>
                        ⚠️ Movie/Episode video upload is <strong>locked</strong> until release ({new Date(selectedItem.releaseDate).toLocaleDateString()}). Trailer upload is allowed.
                      </p>
                    )}
                  </div>

                  {selectedEpisode ? (
                    <div className="form-row">
                      <label className="form-label"><Film size={16} style={{ marginRight: 6 }} /> Episode Video</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="video/*" id="ep-video-input" className="file-input" onChange={e => handleUploadChange("video", e.target.files[0])} />
                        <label htmlFor="ep-video-input" className="file-label">{uploadData.video ? `✓ ${uploadData.video.name}` : "Choose Video File"}</label>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="form-row">
                        <label className="form-label"><Upload size={16} style={{ marginRight: 6 }} /> Poster Image</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="image/*" id="poster-input" className="file-input" onChange={e => handleUploadChange("poster", e.target.files[0])} />
                          <label htmlFor="poster-input" className="file-label">{uploadData.poster ? `✓ ${uploadData.poster.name}` : "Choose Poster"}</label>
                        </div>
                      </div>
                      <div className="form-row">
                        <label className="form-label"><Upload size={16} style={{ marginRight: 6 }} /> Banner Image</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="image/*" id="banner-input" className="file-input" onChange={e => handleUploadChange("banner", e.target.files[0])} />
                          <label htmlFor="banner-input" className="file-label">{uploadData.banner ? `✓ ${uploadData.banner.name}` : "Choose Banner"}</label>
                        </div>
                      </div>
                      {/* Trailer always available (even for coming soon) */}
                      <div className="form-row">
                        <label className="form-label"><Video size={16} style={{ marginRight: 6 }} /> Trailer</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id="trailer-input" className="file-input" onChange={e => handleUploadChange("trailer", e.target.files[0])} />
                          <label htmlFor="trailer-input" className="file-label">{uploadData.trailer ? `✓ ${uploadData.trailer.name}` : "Choose Trailer"}</label>
                        </div>
                      </div>
                      {/* Full video — locked for coming-soon */}
                      {contentType === "movies" && (
                        <div className="form-row">
                          <label className="form-label" style={{ opacity: isLocked(selectedItem) ? 0.5 : 1 }}>
                            <Film size={16} style={{ marginRight: 6 }} /> Movie Video
                            {isLocked(selectedItem) && <span style={{ marginLeft: 6, color: "var(--orange)", fontSize: "0.78rem" }}>(locked until release)</span>}
                          </label>
                          <div className="file-input-wrapper">
                            <input
                              type="file"
                              accept="video/*"
                              id="video-input"
                              className="file-input"
                              disabled={isLocked(selectedItem)}
                              onChange={e => !isLocked(selectedItem) && handleUploadChange("video", e.target.files[0])}
                            />
                            <label htmlFor="video-input" className={`file-label ${isLocked(selectedItem) ? "file-label-locked" : ""}`}>
                              {isLocked(selectedItem) ? "🔒 Locked until release" : uploadData.video ? `✓ ${uploadData.video.name}` : "Choose Video"}
                            </label>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="upload-hint">
                    <small>💡 {selectedEpisode ? "Video replaces existing if already uploaded" : "Files replace existing ones if already uploaded"}</small>
                  </div>
                </div>
              )}

              {/* ---- EPISODE EDIT ---- */}
              {modalMode === "episode-edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Episode #</label>
                      <input className="form-input" type="number" value={editData.episodeNumber || ""} onChange={e => setEditData(s => ({ ...s, episodeNumber: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Season #</label>
                      <input className="form-input" type="number" value={editData.seasonNumber || ""} onChange={e => setEditData(s => ({ ...s, seasonNumber: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={editData.duration || ""} onChange={e => setEditData(s => ({ ...s, duration: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="3" value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* ---- EDIT (Movie / Series) ---- */}
              {modalMode === "edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Title</label>
                      <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Release Year</label>
                      <input className="form-input" type="number" value={editData.releaseYear || ""} onChange={e => setEditData(s => ({ ...s, releaseYear: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Rating (0–10)</label>
                      <input className="form-input" type="number" step="0.1" value={editData.rating || ""} onChange={e => setEditData(s => ({ ...s, rating: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Genre (comma separated)</label>
                      <input className="form-input" value={editData.genre?.join(", ") || ""} onChange={e => setEditData(s => ({ ...s, genre: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Duration</label>
                      <input className="form-input" value={editData.duration || ""} onChange={e => setEditData(s => ({ ...s, duration: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Language</label>
                      <input className="form-input" value={editData.language || ""} onChange={e => setEditData(s => ({ ...s, language: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Premium</label>
                      <select className="form-input" value={editData.isPremium ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isPremium: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Coming Soon</label>
                      <select className="form-input" value={editData.isComingSoon ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isComingSoon: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    {editData.isComingSoon && (
                      <div className="form-row">
                        <label className="form-label">Release Date</label>
                        <input
                          className="form-input"
                          type="date"
                          value={editData.releaseDate ? new Date(editData.releaseDate).toISOString().split("T")[0] : ""}
                          onChange={e => setEditData(s => ({ ...s, releaseDate: e.target.value }))}
                        />
                      </div>
                    )}
                    {contentType === "series" && (
                      <div className="form-row">
                        <label className="form-label">Total Seasons</label>
                        <input className="form-input" type="number" value={editData.totalSeasons || ""} onChange={e => setEditData(s => ({ ...s, totalSeasons: Number(e.target.value) }))} />
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="3" value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                  </div>

                  {/* Cast Section */}
                  <div className="cast-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        <User size={15} style={{ marginRight: 6, verticalAlign: "middle" }} /> Cast Members
                      </label>
                      <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "0.8rem" }} onClick={addCastMember}>
                        <Plus size={14} /> Add Member
                      </button>
                    </div>

                    {(editData.cast || []).length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No cast members. Click "Add Member" to add.</p>
                    )}

                    <div className="cast-list">
                      {(editData.cast || []).map((c, idx) => (
                        <div key={idx} className="cast-edit-row">
                          {/* Cast image */}
                          <div className="cast-img-upload">
                            {(c._previewUrl || c.image) && (
                              <img src={c._previewUrl || c.image} alt={c.name} className="cast-img-preview" />
                            )}
                            <div className="file-input-wrapper">
                              <input
                                type="file"
                                accept="image/*"
                                id={`cast-img-${idx}`}
                                className="file-input"
                                onChange={e => setCastImageFile(idx, e.target.files[0])}
                              />
                              <label htmlFor={`cast-img-${idx}`} className="file-label cast-file-label">
                                {castFiles[idx] ? "✓ Changed" : c.image ? "Change Photo" : "Upload Photo"}
                              </label>
                            </div>
                          </div>
                          {/* Cast name */}
                          <input
                            className="form-input"
                            placeholder="Cast member name"
                            value={c.name || ""}
                            onChange={e => updateCastMember(idx, "name", e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button className="icon-btn del" title="Remove" onClick={() => removeCastMember(idx)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Buttons */}
            <div className="modal-footer">
              {modalMode === "upload" && (
                <button className="btn btn-primary" onClick={handleUpload}>
                  <Upload size={18} style={{ marginRight: 6 }} /> Upload Files
                </button>
              )}
              {modalMode === "edit" && (
                <button className="btn btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
              )}
              {modalMode === "episode-edit" && (
                <button className="btn btn-primary" onClick={handleEpisodeSave}>
                  Save Episode
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeModal}>
                {(modalMode === "view" || modalMode === "episode-view") ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}