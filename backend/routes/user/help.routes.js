const express = require("express");
const router = express.Router();

const { getAllHelp,getHelpByCategory } = require("../../controllers/help.controller");

// public
router.get("/", getAllHelp);
router.get("/:category", getHelpByCategory);

module.exports = router;