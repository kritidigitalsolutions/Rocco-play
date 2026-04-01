const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: String,
  image: String
});

const seriesSchema = new mongoose.Schema(
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

    totalSeasons: Number
  },
  { timestamps: true }
);

// slug generator
seriesSchema.pre("save", function () {
  if (this.title) {
    this.slug = this.title.toLowerCase().replace(/\s+/g, "-");
  }
});



module.exports = mongoose.model("Series", seriesSchema);