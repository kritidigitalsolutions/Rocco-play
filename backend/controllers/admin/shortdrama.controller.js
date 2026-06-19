const ShortDrama = require(
  "../../models/shortdrama.model"
);

const DramaEpisode = require(
  "../../models/dramaEpisode.model"
);

const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");


// PARSE JSON
const parseJSON = (
  value,
  defaultValue = []
) => {
  try {
    return value
      ? JSON.parse(value)
      : defaultValue;
  } catch {
    return defaultValue;
  }
};


// ADD SHORT DRAMA
const addShortDrama = async (
  req,
  res
) => {
  try {

    const genre = parseJSON(
      req.body.genre
    );

    const category = parseJSON(
      req.body.category
    );

    const cast = parseJSON(
      req.body.cast
    );

    const poster =
      req.files?.poster?.[0];

    const banner =
      req.files?.banner?.[0];

    const trailer =
      req.files?.trailer?.[0];

    // CAST IMAGES
    const castFiles = Object.keys(
      req.files || {}
    ).filter((key) =>
      key.startsWith("castImage_")
    );

    castFiles.forEach((key) => {

      const index =
        key.split("_")[1];

      const file =
        req.files[key][0];

      if (cast[index]) {
        cast[index].image =
          getMediaUrl(file);
      }
    });

    const shortDrama =
      await ShortDrama.create({

        title: req.body.title,

        description:
          req.body.description || "",

        genre,

        language:
          req.body.language || "",

        poster: getMediaUrl(
          poster,
          req.body.poster
        ),

        banner: getMediaUrl(
          banner,
          req.body.banner
        ),

        trailerUrl: getMediaUrl(
          trailer,
          req.body.trailerUrl
        ),

        isPremium:
          req.body.isPremium ===
          "true",

        status:
          req.body.status ||
          "ongoing",

        cast,

        category,
      });

    return res.status(201).json({
      success: true,
      message:
        "Short drama added successfully",
      shortDrama,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to add short drama",
      error: error.message,
    });
  }
};


// GET ALL SHORT DRAMAS
const getAllShortDramas =
  async (req, res) => {
    try {

      const dramas =
        await ShortDrama.find()
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch dramas",
      });
    }
  };


// GET SINGLE SHORT DRAMA
const getShortDramaById =
  async (req, res) => {
    try {

      const shortDrama =
        await ShortDrama.findById(
          req.params.id
        );

      if (!shortDrama) {
        return res.status(404).json({
          success: false,
          message:
            "Short drama not found",
        });
      }

      return res.json({
        success: true,
        shortDrama,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch short drama",
      });
    }
  };


// UPDATE SHORT DRAMA
const updateShortDrama =
  async (req, res) => {
    try {

      const drama =
        await ShortDrama.findById(
          req.params.id
        );

      if (!drama) {
        return res.status(404).json({
          success: false,
          message:
            "Short drama not found",
        });
      }

      const genre = parseJSON(
        req.body.genre,
        drama.genre
      );

      const category = parseJSON(
        req.body.category,
        drama.category
      );

      const cast = parseJSON(
        req.body.cast,
        drama.cast
      );

      if (req.body.title)
        drama.title =
          req.body.title;

      if (req.body.description)
        drama.description =
          req.body.description;

      if (req.body.language)
        drama.language =
          req.body.language;

      drama.genre = genre;

      drama.category = category;

      drama.isPremium =
        req.body.isPremium ===
        "true";

      drama.status =
        req.body.status ||
        drama.status;


      // POSTER
      if (req.files?.poster?.[0]) {

        deleteMedia(drama.poster);

        drama.poster =
          getMediaUrl(req.files.poster[0]);
      }


      // BANNER
      if (req.files?.banner?.[0]) {

        deleteMedia(drama.banner);

        drama.banner =
          getMediaUrl(req.files.banner[0]);
      }


      // TRAILER
      if (req.files?.trailer?.[0]) {

        deleteMedia(
          drama.trailerUrl
        );

        drama.trailerUrl =
          getMediaUrl(req.files.trailer[0]);
      }


      // CAST
      const castFiles =
        Object.keys(
          req.files || {}
        ).filter((key) =>
          key.startsWith(
            "castImage_"
          )
        );

      castFiles.forEach((key) => {

        const index =
          key.split("_")[1];

        const file =
          req.files[key][0];

        if (cast[index]) {
          cast[index].image =
            getMediaUrl(file);
        }
      });

      drama.cast = cast;

      await drama.save();

      return res.json({
        success: true,
        message:
          "Short drama updated successfully",
        drama,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to update short drama",
      });
    }
  };


// DELETE SHORT DRAMA
const deleteShortDrama =
  async (req, res) => {
    try {

      const drama =
        await ShortDrama.findById(
          req.params.id
        );

      if (!drama) {
        return res.status(404).json({
          success: false,
          message:
            "Short drama not found",
        });
      }

      deleteMedia(drama.poster);

      deleteMedia(drama.banner);

      deleteMedia(
        drama.trailerUrl
      );

      drama.cast.forEach((c) =>
        deleteMedia(c.image)
      );


      // DELETE EPISODES
      const episodes =
        await DramaEpisode.find({
          shortDramaId:
            drama._id,
        });

      episodes.forEach((ep) => {
        deleteMedia(ep.videoUrl);
        deleteMedia(ep.thumbnail);
      });

      await DramaEpisode.deleteMany({
        shortDramaId:
          drama._id,
      });

      await ShortDrama.findByIdAndDelete(
        req.params.id
      );

      return res.json({
        success: true,
        message:
          "Short drama deleted successfully",
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete short drama",
      });
    }
  };


// SEARCH
const searchShortDrama =
  async (req, res) => {
    try {

      const { q } = req.query;

      const dramas =
        await ShortDrama.find({
          title: {
            $regex: q,
            $options: "i",
          },
        });

      return res.json({
        success: true,
        results: dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  addShortDrama,
  getAllShortDramas,
  getShortDramaById,
  updateShortDrama,
  deleteShortDrama,
  searchShortDrama,
};