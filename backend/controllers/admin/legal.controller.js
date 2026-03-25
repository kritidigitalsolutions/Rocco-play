const legalModel = require("../../models/legal.model");

//Get all legal documents
exports.getLegalDocuments = async (req, res) => {
  try {
    const documents = await legalModel.find().sort("type");
    res.status(200).json({ documents });
  } catch (error) { 
    console.error("Error in getting legal documents:", error);
    res.status(500).json({ message: "Server error" });
  } 
};
//get legal document by type
exports.getLegalByType = async (req, res) => {
  try {
    const document = await legalModel.findOne({ type: req.params.type });   
    if (!document) {
        return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json({ document });
  } catch (error) {
    console.error("Error in getting legal document by type:", error);
    res.status(500).json({ message: "Server error" });
  }
};
//Add or update legal document
exports.addOrUpdateLegalDocument = async (req, res) => {
  try {
    const { type, title, content } = req.body;

    if (!type || !title || !content) {
      return res.status(400).json({
        message: "Type, title and content required"
      });
    }

    let document = await legalModel.findOne({ type });

    if (document) {
      document.content = content;
      document.title = title;
      await document.save();

      return res.status(200).json({
        message: "Document updated",
        document
      });
    } else {
      document = await legalModel.create({
        type,
        title,
        content
      });

      return res.status(201).json({
        message: "Document created",
        document
      });
    }

  } catch (error) {
    console.error("Error in adding/updating legal document:", error);
    res.status(500).json({ message: "Server error" });
  }
};
//Delete legal document
// exports.deleteLegalDocument = async (req, res) => {
//   try { 
//     const { id } = req.params;
//     const document = await legalModel.findByIdAndDelete(id);
//     if (!document) {
//       return res.status(404).json({ message: "Document not found" });
//     }
//     res.status(200).json({ message: "Document deleted" });
//     } catch (error) {
//     console.error("Error in deleting legal document:", error);
//     res.status(500).json({ message: "Server error" });
//   } 
// };

// ─── TOGGLE PUBLISH ───────────────────────────────────────────────────────────
// PATCH /api/admin/legal/:type/toggle
exports.togglePublish = async (req, res) => {
  try {
    const page = await legalModel.findOne({ type: req.params.type });
    if (!page) return res.status(404).json({ success: false, message: "Legal page not found" });
    page.isPublished = !page.isPublished;
    await page.save();
    res.status(200).json({ success: true, message: `Legal page ${page.isPublished ? "published" : "unpublished"}`, page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
  
};
