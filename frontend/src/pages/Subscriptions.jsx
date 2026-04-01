import { useEffect, useState } from "react";
import axios from "axios";
import "./Subscription.css";

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    const token = localStorage.getItem("token");

    const res = await axios.get(
      "http://localhost:5000/api/subscription/all",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setSubs(res.data.subscriptions);
  };

  return (
    <div className="subscription-page">
      <h2>💳 Subscriptions</h2>

      <table className="subscription-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Expiry</th>
          </tr>
        </thead>

        <tbody>
          {subs.map((sub) => {
            const isActive =
              sub.status === "active" &&
              new Date(sub.endDate) > new Date();

            return (
              <tr key={sub._id}>
                <td>{sub.user?.name || "-"}</td>
                <td>{sub.user?.email || "-"}</td>

                <td className="plan">{sub.plan}</td>

                <td>
                  <span className={isActive ? "status active" : "status expired"}>
                    {isActive ? "Active" : "Expired"}
                  </span>
                </td>

                <td>₹{sub.amount || 0}</td>

                <td>
                  {sub.endDate
                    ? new Date(sub.endDate).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}