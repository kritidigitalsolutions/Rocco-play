import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardHome from "../pages/Dashboard";
import UsersPage from "../pages/UsersPage";
import LegalPage from "../pages/LegalPage";
import HelpPage from "../pages/HelpPage";
import AddContent from "../pages/AddContent";
import Content from "../pages/Content";
import Settings from "../pages/Settings";
import SubscriptionPage from "../pages/Subscriptions";
import "./AdminLayout.css";
import RatingsPage from "../pages/Ratings";
import PlansPage from "../pages/Plans";
import PromoVoucher from "../pages/PromoVoucher";


export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme]         = useState("dark"); // "dark" | "light"

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("light", next === "light");
  };

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />

      <div className="page-shell">
        <Topbar theme={theme} toggleTheme={toggleTheme} setActiveTab={setActiveTab}/>

        <main className="page-body">
          {activeTab === "dashboard"   && <DashboardHome />}
          {activeTab === "users"       && <UsersPage />}
          {activeTab === "legal"       && <LegalPage />}
          {activeTab === "help"        && <HelpPage />}
          {activeTab === "add-content" && <AddContent />}
          {activeTab === "content"     && <Content />}
          {activeTab === "ratings" && <RatingsPage />}
          {activeTab === "plans" && <PlansPage />}
          {activeTab === "promo" && <PromoVoucher />}
          
          {activeTab === "pricing" && <SubscriptionPage />}
          {activeTab === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}

function ComingSoon({ title }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">🚧</div>
      <h2>{title}</h2>
      <p>This module is under construction. Coming soon!</p>
    </div>
  );
}