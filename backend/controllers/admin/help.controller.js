const Help = require("../../models/help.model");

// ➕ ADD Q&A
exports.addHelp = async (req, res) => {
  try {
    const { category, question, answer } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({ message: "All fields required" });
    }

    const help = await Help.create({ category, question, answer });

    res.status(201).json({
      success: true,
      message: "Help added",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📥 GET ALL (ADMIN)
exports.getAllHelp = async (req, res) => {
  try {
    const data = await Help.find().sort("-createdAt");

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ UPDATE
exports.updateHelp = async (req, res) => {
  try {
    const help = await Help.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json({
      message: "Updated",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ DELETE
exports.deleteHelp = async (req, res) => {
  try {
    await Help.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔁 TOGGLE VISIBILITY
exports.toggleHelp = async (req, res) => {
  try {
    const help = await Help.findById(req.params.id);

    help.isPublished = !help.isPublished;
    await help.save();

    res.status(200).json({
      message: "Toggled",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};