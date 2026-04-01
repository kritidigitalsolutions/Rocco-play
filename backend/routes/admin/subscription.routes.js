const express = require("express");
const router = express.Router();

const { getRevenue } = require("../../controllers/admin/admin.subscription.controller");
const { isAuth } = require("../../middlewares/auth.middleware"); 
const { isAdmin } = require("../../middlewares/admin.middleware");

router.get("/revenue", isAuth, isAdmin, getRevenue);

module.exports = router;