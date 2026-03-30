import { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import "./Content.css";
import { Eye, Edit2, Upload, Trash2, X, Play, Film, Tv } from "lucide-react";

export default function Content() {
  const [contentType, setContentType] = useState("movies");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState(null); // "view" | "edit" | "upload"
  const [editData, setEditData] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null); // Store selected episode for playback
  const [uploadData, setUploadData] = useState({
    poster: null,
    banner: null,
    video: null
  });
  const videoRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [contentType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = contentType === "movies" ? "/movies" : "/series";
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
      setEpisodes(res.data.data || []);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  };

  const handleSeriesClick = (series) => {
    setSelectedSeries(series);
    fetchEpisodes(series._id);
  };

  const openView = (item) => {
    setSelectedItem(item);
    setModalMode("view");
    setEditData(null);
  };

  const openEdit = (item) => {
    setEditData({ ...item });
    setSelectedItem(item);
    setModalMode("edit");
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalMode(null);
    setEditData(null);
    setSelectedEpisode(null);
    setUploadData({ poster: null, banner: null, video: null });
  };

  const openEpisodePlayer = (episode) => {
    setSelectedEpisode(episode);
    setSelectedItem(episode);
    setModalMode("episode-view");
  };

  const openUpload = (item, isEpisode = false) => {
    setSelectedItem(item);
    setSelectedEpisode(isEpisode ? item : null);
    setModalMode("upload");
    setUploadData({ poster: null, banner: null, video: null });
  };

  const openEpisodeEdit = (episode) => {
    setEditData({ ...episode });
    setSelectedItem(episode);
    setSelectedEpisode(episode);
    setModalMode("episode-edit");
  };

  const handleUploadChange = (field, file) => {
    setUploadData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleUpload = async () => {
    // For episodes - only video required
    if (selectedEpisode && !uploadData.video) {
      alert("Please select a video file to upload");
      return;
    }

    // For series/movies - at least one file required
    if (!selectedEpisode && !uploadData.poster && !uploadData.banner && !uploadData.video) {
      alert("Please select at least one file to upload");
      return;
    }

    try {
      const formData = new FormData();
      
      if (selectedEpisode) {
        // Episode video upload/update
        if (uploadData.video) formData.append("video", uploadData.video);

        await API.put(`/episodes/${selectedEpisode._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        alert("Episode video uploaded successfully");
        closeModal();
        fetchEpisodes(selectedSeries._id);
      } else {
        // Series/Movie upload
        if (uploadData.poster) formData.append("poster", uploadData.poster);
        if (uploadData.banner) formData.append("banner", uploadData.banner);
        if (uploadData.video) formData.append("video", uploadData.video);

        if (contentType === "movies") {
          await API.post(`/movies`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
        } else {
          await API.post(`/series`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
        }

        alert("Upload successful");
        closeModal();
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP failed:", error);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete '${item.title || item.name}' permanently?`);
    if (!confirmed) return;

    try {
      if (contentType === "movies") {
        await API.delete(`/movies/slug/${item.slug}`);
      } else {
        await API.delete(`/series/${item.slug}`);
      }
      alert("Deleted successfully");
      fetchData();
      if (selectedSeries && selectedSeries._id === item._id) {
        setSelectedSeries(null);
        setEpisodes([]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const handleSave = async () => {
    if (!editData) return;
    try {
      if (contentType === "movies") {
        await API.put(`/movies/slug/${selectedItem.slug}`, editData);
      } else {
        await API.put(`/series/${selectedItem.slug}`, editData);
      }
      alert("Saved successfully");
      closeModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const handleEpisodeSave = async () => {
    if (!editData) return;
    try {
      await API.put(`/episodes/${selectedEpisode._id}`, editData);
      alert("Episode saved successfully");
      closeModal();
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      console.error(err);
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEpisodeDelete = async (episode) => {
    const confirmed = window.confirm(`Delete episode ${episode.episodeNumber}: ${episode.title}?`);
    if (!confirmed) return;

    try {
      await API.delete(`/episodes/${episode._id}`);
      alert("Episode deleted successfully");
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const groupEpisodesBySeason = () => {
    const grouped = {};
    episodes.forEach(ep => {
      if (!grouped[ep.seasonNumber]) grouped[ep.seasonNumber] = [];
      grouped[ep.seasonNumber].push(ep);
    });
    return grouped;
  };

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Film style={{ display: "inline-block", marginRight: 8 }} size={32} /> Content Management</h1>
          <p className="pg-sub">View and manage movies and series</p>
        </div>
      </div>

      {/* Content Type Selector */}
      <div className="content-box">
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <button
            className={`btn ${contentType === "movies" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setContentType("movies")}
          >
            <Film size={18} style={{ marginRight: 6 }} /> Movies
          </button>
          <button
            className={`btn ${contentType === "series" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setContentType("series")}
          >
            <Tv size={18} style={{ marginRight: 6 }} /> Series
          </button>
        </div>

        {/* Movies Table */}
        {contentType === "movies" && (
          <div>
            <h3><Film size={20} style={{ display: "inline-block", marginRight: 8 }} /> Movies ({data.length})</h3>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Genre</th>
                      <th>Release Year</th>
                      <th>Rating</th>
                      <th>Premium</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr><td colSpan={6}>No movies found</td></tr>
                    ) : data.map(movie => (
                      <tr key={movie._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={movie.poster} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{movie.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{movie.duration}</div>
                            </div>
                          </div>
                        </td>
                        <td>{movie.genre?.join(", ")}</td>
                        <td>{movie.releaseYear}</td>
                        <td>{movie.rating}</td>
                        <td>
                          <span className={`badge ${movie.isPremium ? "badge-active" : "badge-draft"}`}>
                            {movie.isPremium ? "Premium" : "Free"}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-pub">Published</span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(movie)} title="View"><Eye size={18} /></button>
                            <button className="icon-btn edit" onClick={() => openEdit(movie)} title="Edit"><Edit2 size={18} /></button>
                            <button className="icon-btn upload" onClick={() => openUpload(movie)} title="Upload"><Upload size={18} /></button>
                            <button className="icon-btn del" onClick={() => handleDelete(movie)} title="Delete"><Trash2 size={18} /></button>
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

        {/* Series Table */}
        {contentType === "series" && !selectedSeries && (
          <div>
            <h3><Tv size={20} style={{ display: "inline-block", marginRight: 8 }} /> Series ({data.length})</h3>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Genre</th>
                      <th>Release Year</th>
                      <th>Rating</th>
                      <th>Seasons</th>
                      <th>Premium</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr><td colSpan={7}>No series found</td></tr>
                    ) : data.map(series => (
                      <tr key={series._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={series.poster} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{series.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{series.duration}</div>
                            </div>
                          </div>
                        </td>
                        <td>{series.genre?.join(", ")}</td>
                        <td>{series.releaseYear}</td>
                        <td>{series.rating}</td>
                        <td>{series.totalSeasons}</td>
                        <td>
                          <span className={`badge ${series.isPremium ? "badge-active" : "badge-draft"}`}>
                            {series.isPremium ? "Premium" : "Free"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(series)} title="View"><Eye size={18} /></button>
                            <button className="icon-btn edit" onClick={() => openEdit(series)} title="Edit"><Edit2 size={18} /></button>
                            <button className="icon-btn upload" onClick={() => openUpload(series)} title="Upload"><Upload size={18} /></button>
                            <button className="icon-btn del" onClick={() => handleDelete(series)} title="Delete"><Trash2 size={18} /></button>
                            <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => handleSeriesClick(series)}>
                              Episodes
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

        {/* Episodes View */}
        {selectedSeries && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <button className="btn btn-ghost" onClick={() => setSelectedSeries(null)}>
                ← Back to Series
              </button>
              <h3><Tv size={20} style={{ display: "inline-block", marginRight: 8 }} />  {selectedSeries.title} - Episodes</h3>
            </div>

            {Object.entries(groupEpisodesBySeason()).map(([seasonNum, eps]) => (
              <div key={seasonNum} style={{ marginBottom: 32 }}>
                <h4 style={{ marginBottom: 16 }}>Season {seasonNum} ({eps.length} episodes)</h4>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Episode</th>
                        <th>Title</th>
                        <th>Duration</th>
                        <th>Video URL</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eps.sort((a, b) => a.episodeNumber - b.episodeNumber).map(ep => (
                        <tr key={ep._id}>
                          <td style={{ fontWeight: 600 }}>{ep.episodeNumber}</td>
                          <td>{ep.title}</td>
                          <td>{ep.duration}</td>
                          <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ep.videoUrl}
                          </td>
                          <td>
                            <div className="tbl-actions">
                              <button 
                                className="icon-btn view" 
                                onClick={() => openEpisodePlayer(ep)}
                                title="Play Episode"
                              >
                                <Play size={18} />
                              </button>
                              <button 
                                className="icon-btn edit" 
                                onClick={() => openEpisodeEdit(ep)}
                                title="Edit Episode"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                className="icon-btn upload" 
                                onClick={() => openUpload(ep, true)}
                                title="Upload Video"
                              >
                                <Upload size={18} />
                              </button>
                              <button 
                                className="icon-btn del" 
                                onClick={() => handleEpisodeDelete(ep)}
                                title="Delete Episode"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View / Edit / Upload / Episode Player / Episode Edit Modal */}
        {(modalMode === "view" || modalMode === "edit" || modalMode === "upload" || modalMode === "episode-view" || modalMode === "episode-edit") && selectedItem && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className={`modal-box ${(modalMode === "view" || modalMode === "episode-view") ? "modal-box-view" : ""}`} onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <h3>
                  {modalMode === "view" ? "View Content" : 
                   modalMode === "edit" ? "Edit Content" :
                   modalMode === "episode-edit" ? "Edit Episode" :
                   modalMode === "upload" && selectedEpisode ? "Upload Episode Video" :
                   modalMode === "upload" ? "Upload Media" :
                   "Play Episode"}
                </h3>
                <button className="modal-close" onClick={closeModal}><X size={24} /></button>
              </div>
              <div className="modal-body">
                {modalMode === "episode-view" ? (
                  <div className="view-content">
                    {/* Episode Banner Section */}
                    <div className="view-banner">
                      <img src={selectedSeries?.poster || selectedSeries?.banner} alt="Banner" className="banner-image" />
                      <div className="banner-overlay">
                        <h2>Ep {selectedEpisode?.episodeNumber}: {selectedEpisode?.title}</h2>
                      </div>
                    </div>

                    {/* Episode Video Player Section */}
                    <div className="view-video-section">
                      <video
                        ref={videoRef}
                        controls
                        className="view-video-player"
                        src={selectedEpisode?.videoUrl}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <button 
                        className="btn btn-primary pip-btn"
                        onClick={handlePictureInPicture}
                        title="Toggle Picture-in-Picture"
                      >
                        <Tv size={18} style={{ marginRight: 6 }} /> PiP
                      </button>
                    </div>

                    {/* Episode Details Section */}
                    <div className="view-details">
                      <div className="detail-item">
                        <strong>Series:</strong>
                        <span>{selectedSeries?.title}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Duration:</strong>
                        <span>{selectedEpisode?.duration}</span>
                      </div>
                      <div className="detail-full">
                        <strong>Description:</strong>
                        <p>{selectedEpisode?.description || "No description available"}</p>
                      </div>
                    </div>
                  </div>
                ) : modalMode === "view" ? (
                  <div className="view-content">
                    {/* Banner Section */}
                    <div className="view-banner">
                      <img src={selectedItem.poster || selectedItem.banner} alt="Banner" className="banner-image" />
                      <div className="banner-overlay">
                        <h2>{selectedItem.title}</h2>
                      </div>
                    </div>

                    {/* Video Player Section - Only for movies */}
                    {contentType === "movies" && (
                      <>
                        {/* Trailer Section - for movies with trailer */}
                        {selectedItem.trailerUrl && (
                          <div className="view-video-section">
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ marginBottom: 8 }}><Film size={18} style={{ display: "inline-block", marginRight: 6 }} /> Trailer</h4>
                            </div>
                            <video
                              controls
                              className="view-video-player"
                              src={selectedItem.trailerUrl}
                            >
                              Your browser does not support the video tag.
                            </video>
                            <button 
                              className="btn btn-primary pip-btn"
                              onClick={handlePictureInPicture}
                              title="Toggle Picture-in-Picture"
                            >
                              <Tv size={18} style={{ marginRight: 6 }} /> PiP
                            </button>
                          </div>
                        )}

                        {/* Movie Video Section */}
                        <div className="view-video-section">
                          <div style={{ marginBottom: 16 }}>
                            <h4 style={{ marginBottom: 8 }}><Film size={18} style={{ display: "inline-block", marginRight: 6 }} /> Full Movie</h4>
                          </div>
                          <video
                            ref={videoRef}
                            controls
                            className="view-video-player"
                            src={selectedItem.videoUrl}
                          >
                            Your browser does not support the video tag.
                          </video>
                          <button 
                            className="btn btn-primary pip-btn"
                            onClick={handlePictureInPicture}
                            title="Toggle Picture-in-Picture"
                          >
                            <Tv size={18} style={{ marginRight: 6 }} /> PiP
                          </button>
                        </div>
                      </>
                    )}

                    {/* Trailer Player Section - For series */}
                    {contentType === "series" && selectedItem.trailerUrl && (
                      <div className="view-video-section">
                        <video
                          ref={videoRef}
                          controls
                          className="view-video-player"
                          src={selectedItem.trailerUrl}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <button 
                          className="btn btn-primary pip-btn"
                          onClick={handlePictureInPicture}
                          title="Toggle Picture-in-Picture"
                        >
                          <Tv size={18} style={{ marginRight: 6 }} /> PiP
                        </button>
                      </div>
                    )}

                    {/* Details Section */}
                    <div className="view-details">
                      <div className="detail-item">
                        <strong>Release Year:</strong>
                        <span>{selectedItem.releaseYear}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Genre:</strong>
                        <span>{selectedItem.genre?.join(", ")}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Rating:</strong>
                        <span>{selectedItem.rating} ⭐</span>
                      </div>
                      <div className="detail-item">
                        <strong>Duration:</strong>
                        <span>{selectedItem.duration}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Premium:</strong>
                        <span>{selectedItem.isPremium ? "✓ Yes" : "✗ No"}</span>
                      </div>
                      {contentType === "series" && (
                        <div className="detail-item">
                          <strong>Total Seasons:</strong>
                          <span>{selectedItem.totalSeasons}</span>
                        </div>
                      )}
                      <div className="detail-full">
                        <strong>Description:</strong>
                        <p>{selectedItem.description}</p>
                      </div>
                    </div>
                  </div>
                ) : modalMode === "upload" ? (
                  <div className="upload-form">
                    <div className="upload-info">
                      <p>
                        {selectedEpisode 
                          ? `Upload video for: Ep ${selectedEpisode.episodeNumber}: ${selectedEpisode.title}`
                          : `Upload new media files for: ${selectedItem.title}`}
                      </p>
                    </div>

                    {selectedEpisode ? (
                      // Episode video upload only
                      <div className="form-row">
                        <label className="form-label"><Film size={18} style={{ display: "inline-block", marginRight: 6 }} /> Episode Video</label>
                        <div className="file-input-wrapper">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleUploadChange("video", e.target.files[0])}
                            className="file-input"
                            id="episode-video-input"
                          />
                          <label htmlFor="episode-video-input" className="file-label">
                            {uploadData.video ? `✓ ${uploadData.video.name}` : "Choose Video File"}
                          </label>
                        </div>
                      </div>
                    ) : (
                      // Series/Movie upload - poster and banner only (no video)
                      <>
                        <div className="form-row">
                          <label className="form-label"><Upload size={18} style={{ display: "inline-block", marginRight: 6 }} /> Poster Image</label>
                          <div className="file-input-wrapper">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadChange("poster", e.target.files[0])}
                              className="file-input"
                              id="poster-input"
                            />
                            <label htmlFor="poster-input" className="file-label">
                              {uploadData.poster ? `✓ ${uploadData.poster.name}` : "Choose Poster Image"}
                            </label>
                          </div>
                        </div>

                        <div className="form-row">
                          <label className="form-label"><Upload size={18} style={{ display: "inline-block", marginRight: 6 }} /> Banner Image</label>
                          <div className="file-input-wrapper">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadChange("banner", e.target.files[0])}
                              className="file-input"
                              id="banner-input"
                            />
                            <label htmlFor="banner-input" className="file-label">
                              {uploadData.banner ? `✓ ${uploadData.banner.name}` : "Choose Banner Image"}
                            </label>
                          </div>
                        </div>

                        {contentType === "movies" && (
                          <div className="form-row">
                            <label className="form-label"><Film size={18} style={{ display: "inline-block", marginRight: 6 }} /> Movie Video</label>
                            <div className="file-input-wrapper">
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleUploadChange("video", e.target.files[0])}
                                className="file-input"
                                id="video-input"
                              />
                              <label htmlFor="video-input" className="file-label">
                                {uploadData.video ? `✓ ${uploadData.video.name}` : "Choose Video File"}
                              </label>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="upload-hint">
                      <small>💡 Tip: {selectedEpisode ? "Select video file to update" : "Provide at least one media file"}</small>
                    </div>
                  </div>
                ) : modalMode === "episode-edit" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="form-row">
                      <label className="form-label">Episode Number</label>
                      <input className="form-input" type="number" value={editData.episodeNumber || ""} onChange={e => setEditData(s => ({ ...s, episodeNumber: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Season Number</label>
                      <input className="form-input" type="number" value={editData.seasonNumber || ""} onChange={e => setEditData(s => ({ ...s, seasonNumber: Number(e.target.value) }))} />
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
                      <textarea className="form-input" style={{ minHeight: "100px" }} value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="form-row">
                      <label className="form-label">Title</label>
                      <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Release Year</label>
                      <input className="form-input" type="number" value={editData.releaseYear || ""} onChange={e => setEditData(s => ({ ...s, releaseYear: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Rating</label>
                      <input className="form-input" type="number" step="0.1" value={editData.rating || ""} onChange={e => setEditData(s => ({ ...s, rating: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Genre (comma separated)</label>
                      <input className="form-input" value={editData.genre?.join(", ") || ""} onChange={e => setEditData(s => ({ ...s, genre: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Premium</label>
                      <select className="form-input" value={editData.isPremium ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isPremium: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>
                )}

                {modalMode === "upload" ? (
                  <button className="btn btn-primary" onClick={handleUpload}>
                          <label className="form-label"><Upload size={18} style={{ display: "inline-block", marginRight: 6 }} /> Upload Files</label>
                  </button>
                ) : modalMode === "edit" ? (
                  <button className="btn btn-primary" onClick={handleSave}>
                    Save Changes
                  </button>
                ) : modalMode === "episode-edit" ? (
                  <button className="btn btn-primary" onClick={handleEpisodeSave}>
                    Save Episode
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}