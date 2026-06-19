const mongoose = require("mongoose");

const dramaEpisodeSchema =
  new mongoose.Schema(
    {
      shortDramaId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "ShortDrama",

        required: true,
      },

      episodeNumber: {
        type: Number,
        required: true,
      },

      title: String,

      description: String,

      videoUrl: String,

      thumbnail: String,

      duration: String,

      isLocked: {
        type: Boolean,
        default: false,
      },

      isVertical: {
        type: Boolean,
        default: true,
      },

      views: {
        type: Number,
        default: 0,
      },

      likes: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "DramaEpisode",
  dramaEpisodeSchema
);