import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";

export default function RatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    try {
      const res = await API.get("rating/all");
      setRatings(res.data.ratings);
    } catch (err) {
      console.error("Error fetching ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">⭐ User Ratings</h1>
        <p className="pg-sub">All user feedback and reviews</p>
      </div>

      <div className="content-box">
        {loading ? (
          <p>Loading...</p>
        ) : ratings.length === 0 ? (
          <div className="empty-state">
            <p>No ratings yet</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {ratings.map((r) => (
                  <tr key={r._id}>
                    <td className="u-name">{r.user?.name || "N/A"}</td>
                    <td>{r.user?.email || "N/A"}</td>
                    <td>
                      <span className="badge badge-active">
                        ⭐ {r.rating}/5
                      </span>
                    </td>
                    <td>{r.review || "-"}</td>
                    <td>
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}