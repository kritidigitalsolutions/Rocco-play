const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: String,
  image: String
});

//  Main Schema
const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    description: String,
    genre: [String],

    releaseYear: Number,
    duration: String,
    language: String,

    poster: String,
    banner: String,
    isComingSoon: { type: Boolean, default: false },
    releaseDate: { type: Date },



    // Only for movies
    videoUrl:String,

    trailerUrl: String,

    isPremium: { type: Boolean, default: false },

    rating: Number,

    cast: [castSchema],

    category: [
      {
        type: String,
        enum: ["trending", "top10", "recommended"]
      }
    ]
  },
  { timestamps: true }
);

//  Auto-generate slug
movieSchema.pre("save", function () {
  if (this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
});

module.exports = mongoose.model("Movie", movieSchema);