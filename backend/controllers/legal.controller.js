const legalModel = require("../models/legal.model");

// GET ALL PUBLISHED LEGAL DOCS
exports.getLegalForUser = async (req, res) => {
  try {
    const documents = await legalModel.find({ isPublished: true });

    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error("Error fetching legal docs for user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE LEGAL DOC BY TYPE (ONLY IF PUBLISHED)
exports.getLegalByTypeForUser = async (req, res) => {
  try {
    const document = await legalModel.findOne({
      type: req.params.type,
      isPublished: true
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not available"
      });
    }

    res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    console.error("Error fetching legal doc:", error);
    res.status(500).json({ message: "Server error" });
  }
};