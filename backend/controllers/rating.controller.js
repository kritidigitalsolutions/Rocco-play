const Rating = require("../models/rating.model");

// ⭐ ADD / UPDATE RATING (USER)
exports.addOrUpdateRating = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, review } = req.body;

        // validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        let existing = await Rating.findOne({ user: userId });

        // 🔁 Update
        if (existing) {
            existing.rating = rating;
            existing.review = review || existing.review;
            await existing.save();

            return res.json({
                success: true,
                message: "Rating updated",
                rating: existing
            });
        }

        // ➕ Create
        const newRating = await Rating.create({
            user: userId,
            rating,
            review
        });

        res.json({
            success: true,
            message: "Rating added",
            rating: newRating
        });

    } catch (error) {
        console.error("Rating Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// ⭐ GET ALL RATINGS (ADMIN)
exports.getAllRatings = async (req, res) => {
    try {
        const ratings = await Rating.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            ratings
        });

    } catch (error) {
        console.error("Fetch Ratings Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};