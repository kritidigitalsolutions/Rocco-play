import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Subscription.css";

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    const res = await API.get("/admin/subscription/all");

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

                <td className="plan">{sub.plan?.name || sub.plan || "-"}</td>

                <td>
                  <span className={isActive ? "status active" : "status expired"}>
                    {sub.status === "active" ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired"}
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