const User = require("../../models/user.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Category = require("../../models/category.model");
const Plan = require("../../models/plan.model");
const Help = require("../../models/help.model");
const PromoCode = require("../../models/promocode.model");

// Escape special regex characters to avoid regex errors / ReDoS
const escapeRegex = (string = "") => {
  return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// Static quick-jump pages for admin dashboard
const DASHBOARD_PAGES = [
  {
    title: "Users Management",
    name: "Users",
    subtitle: "Manage all registered users & accounts",
    type: "Page",
    route: "/dashboard/users",
    keywords: ["user", "users", "customer", "account", "profile", "member", "people"]
  },
  {
    title: "Content Library",
    name: "Content Library",
    subtitle: "All movies & series catalog",
    type: "Page",
    route: "/dashboard/content",
    keywords: ["content", "movie", "movies", "series", "shows", "video", "catalog"]
  },
  {
    title: "Add New Content",
    name: "Add Content",
    subtitle: "Upload new movie or series",
    type: "Page",
    route: "/dashboard/add-content",
    keywords: ["add", "upload", "create", "new movie", "new series", "new content"]
  },
  {
    title: "Categories & Genres",
    name: "Categories",
    subtitle: "Manage dynamic genre and category tags",
    type: "Page",
    route: "/dashboard/categories",
    keywords: ["category", "categories", "genre", "genres", "tags"]
  },
  {
    title: "Subscription Plans",
    name: "Plans",
    subtitle: "Manage pricing & membership tiers",
    type: "Page",
    route: "/dashboard/plans",
    keywords: ["plan", "plans", "pricing", "membership", "tier"]
  },
  {
    title: "Website Plans",
    name: "Website Plans",
    subtitle: "Frontend landing page subscription display",
    type: "Page",
    route: "/dashboard/website-plans",
    keywords: ["website plan", "landing plans", "pricing display"]
  },
  {
    title: "Promo & Vouchers",
    name: "Promo & Vouchers",
    subtitle: "Discount coupons and gift vouchers",
    type: "Page",
    route: "/dashboard/promo",
    keywords: ["promo", "voucher", "promocode", "coupon", "discount", "offer"]
  },
  {
    title: "Subscriptions & Orders",
    name: "Subscriptions",
    subtitle: "Active subscriptions and transactions",
    type: "Page",
    route: "/dashboard/pricing",
    keywords: ["subscription", "subscriptions", "payment", "revenue", "order", "billing"]
  },
  {
    title: "User Ratings & Reviews",
    name: "Ratings",
    subtitle: "User feedback, stars, and reviews",
    type: "Page",
    route: "/dashboard/ratings",
    keywords: ["rating", "ratings", "review", "reviews", "stars", "feedback"]
  },
  {
    title: "Push Notifications",
    name: "Notifications",
    subtitle: "Broadcast announcements and alerts",
    type: "Page",
    route: "/dashboard/notifications",
    keywords: ["notification", "notifications", "push", "alert", "broadcast", "fcm"]
  },
  {
    title: "Help & FAQ Management",
    name: "Help",
    subtitle: "Support articles, FAQs, and contact info",
    type: "Page",
    route: "/dashboard/help",
    keywords: ["help", "support", "faq", "ticket", "questions", "contact"]
  },
  {
    title: "Legal & Policies",
    name: "Legal",
    subtitle: "Terms of service, privacy policy, refund policy",
    type: "Page",
    route: "/dashboard/legal",
    keywords: ["legal", "terms", "privacy", "policy", "refund", "disclaimer"]
  },
  {
    title: "Company Information",
    name: "Company Info",
    subtitle: "Business address, support email, phone, social links",
    type: "Page",
    route: "/dashboard/company-info",
    keywords: ["company", "about", "contact info", "social", "address", "phone"]
  },
  {
    title: "Payment Gateways",
    name: "Payment Gateways",
    subtitle: "HDFC, Zaakpay, SabPaisa config & status",
    type: "Page",
    route: "/dashboard/payment-gateways",
    keywords: ["payment", "gateway", "gateways", "hdfc", "zaakpay", "sabpaisa", "merchant"]
  },
  {
    title: "Admin Settings",
    name: "Settings",
    subtitle: "Change password and credentials",
    type: "Page",
    route: "/dashboard/settings",
    keywords: ["setting", "settings", "password", "security", "profile", "account"]
  }
];

const globalAdminSearch = async (req, res) => {
  try {
    const rawQuery = (req.query.q || "").trim();

    if (!rawQuery) {
      return res.json({
        success: true,
        data: []
      });
    }

    const escaped = escapeRegex(rawQuery);
    const regex = new RegExp(escaped, "i");

    // Match relevant navigation pages
    const matchingPages = DASHBOARD_PAGES.filter(
      (p) =>
        regex.test(p.title) ||
        regex.test(p.name) ||
        p.keywords.some((k) => regex.test(k))
    ).slice(0, 3);

    // Parallel queries across collections
    const [
      usersResult,
      moviesResult,
      seriesResult,
      categoriesResult,
      plansResult,
      helpResult,
      promosResult
    ] = await Promise.allSettled([
      User.find({
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex }
        ]
      })
        .select("name email phone profileImage role isBlocked")
        .limit(6)
        .lean(),

      Movie.find({
        $or: [
          { title: regex },
          { genre: regex }
        ]
      })
        .select("title genre poster releaseYear isComingSoon isPublished")
        .limit(6)
        .lean(),

      Series.find({
        $or: [
          { title: regex },
          { genre: regex }
        ]
      })
        .select("title genre poster releaseYear isComingSoon isPublished")
        .limit(6)
        .lean(),

      Category.find({
        $or: [
          { name: regex },
          { slug: regex }
        ]
      })
        .select("name slug color")
        .limit(4)
        .lean(),

      Plan.find({
        name: regex
      })
        .select("name price duration")
        .limit(4)
        .lean(),

      Help.find({
        $or: [
          { question: regex },
          { category: regex },
          { answer: regex }
        ]
      })
        .select("question category")
        .limit(4)
        .lean(),

      PromoCode.find({
        code: regex
      })
        .select("code discountType discountValue")
        .limit(4)
        .lean()
    ]);

    const results = [];

    // 1. Dashboard navigation pages
    for (const page of matchingPages) {
      results.push(page);
    }

    // 2. Movies
    if (moviesResult.status === "fulfilled" && Array.isArray(moviesResult.value)) {
      for (const m of moviesResult.value) {
        results.push({
          id: m._id,
          title: m.title,
          name: m.title,
          subtitle: [
            Array.isArray(m.genre) ? m.genre.join(", ") : m.genre,
            m.releaseYear,
            m.isComingSoon ? "Coming Soon" : null
          ].filter(Boolean).join(" • "),
          type: "Movie",
          route: "/dashboard/content",
          image: m.poster || null
        });
      }
    }

    // 3. Series
    if (seriesResult.status === "fulfilled" && Array.isArray(seriesResult.value)) {
      for (const s of seriesResult.value) {
        results.push({
          id: s._id,
          title: s.title,
          name: s.title,
          subtitle: [
            Array.isArray(s.genre) ? s.genre.join(", ") : s.genre,
            s.releaseYear,
            s.isComingSoon ? "Coming Soon" : null
          ].filter(Boolean).join(" • "),
          type: "Series",
          route: "/dashboard/content",
          image: s.poster || null
        });
      }
    }

    // 4. Users
    if (usersResult.status === "fulfilled" && Array.isArray(usersResult.value)) {
      for (const u of usersResult.value) {
        results.push({
          id: u._id,
          title: u.name || u.phone || "User",
          name: u.name || u.phone,
          subtitle: [u.phone, u.email].filter(Boolean).join(" • "),
          type: "User",
          route: "/dashboard/users",
          image: u.profileImage || null
        });
      }
    }

    // 5. Categories
    if (categoriesResult.status === "fulfilled" && Array.isArray(categoriesResult.value)) {
      for (const c of categoriesResult.value) {
        results.push({
          id: c._id,
          title: c.name,
          name: c.name,
          subtitle: `Category • ${c.slug}`,
          type: "Category",
          route: "/dashboard/categories"
        });
      }
    }

    // 6. Plans
    if (plansResult.status === "fulfilled" && Array.isArray(plansResult.value)) {
      for (const p of plansResult.value) {
        results.push({
          id: p._id,
          title: p.name,
          name: p.name,
          subtitle: `₹${p.price} • ${p.duration} days`,
          type: "Plan",
          route: "/dashboard/plans"
        });
      }
    }

    // 7. Promos
    if (promosResult.status === "fulfilled" && Array.isArray(promosResult.value)) {
      for (const pr of promosResult.value) {
        results.push({
          id: pr._id,
          title: pr.code,
          name: pr.code,
          subtitle: `Promo • ${pr.discountType === "percentage" ? `${pr.discountValue}% OFF` : `₹${pr.discountValue} OFF`}`,
          type: "Promo",
          route: "/dashboard/promo"
        });
      }
    }

    // 8. Help & FAQs
    if (helpResult.status === "fulfilled" && Array.isArray(helpResult.value)) {
      for (const h of helpResult.value) {
        results.push({
          id: h._id,
          title: h.question || h.category,
          name: h.question || h.category,
          subtitle: `Help • ${h.category}`,
          type: "Help",
          route: "/dashboard/help"
        });
      }
    }

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Global Admin Search Error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed: " + error.message,
      data: []
    });
  }
};

module.exports = {
  globalAdminSearch
};
