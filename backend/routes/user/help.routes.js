const express = require("express");

const router = express.Router();

const {getPublishedHelp,getHelpByCategory, getAllHelp} = require("../../controllers/help.controller");


// ========================================
// GET ALL PUBLISHED HELP DATA
// ========================================
router.get("/",getPublishedHelp);


// ========================================
// GET HELP BY CATEGORY
// ========================================
router.get("/:category",getHelpByCategory);


module.exports = router;