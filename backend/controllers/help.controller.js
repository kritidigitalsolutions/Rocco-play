const Help = require("../models/help.model");

//get all 
exports.getAllHelp = async (req, res) => {
  try {
    const data = await Help.find().sort("-createdAt");
    res.status(200).json({ data });
    } catch (error) {
    res.status(500).json({ message: error.message });
    }
};

// 👀 GET BY CATEGORY (ONLY PUBLISHED)
exports.getHelpByCategory = async (req, res) => {
  try {
    const data = await Help.find({
      category: req.params.category,
      isPublished: true
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ========================================
// GET ALL PUBLISHED HELP DATA
// ========================================
exports.getPublishedHelp =
  async (req, res) => {
    try {
      const helpData =
        await Help.find({
          isPublished: true,
        }).sort("-createdAt");

      res.status(200).json({
        success: true,
        count: helpData.length,
        helpData,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };