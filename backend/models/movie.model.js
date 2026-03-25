const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: String,
  image: String
});

// Episode Schema
const episodeSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  duration: String
});

//  Season Schema
const seasonSchema = new mongoose.Schema({
  seasonNumber: Number,
  episodes: [episodeSchema]
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

    type: {
      type: String,
      enum: ["movie", "series"],
      default: "movie"
    },

    releaseYear: Number,
    duration: String,
    language: String,

    poster: String,
    banner: String,

    // Only required for movies
    videoUrl: {
      type: String,
      required: function () {
        return this.type === "movie";
      }
    },

    trailerUrl: String,

    isPremium: { type: Boolean, default: false },

    rating: Number,

    cast: [castSchema],

    category: [
      {
        type: String,
        enum: ["trending", "top10", "recommended"]
      }
    ],

    // Only for series
    seasons: {
      type: [seasonSchema],
      default: []
    }
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