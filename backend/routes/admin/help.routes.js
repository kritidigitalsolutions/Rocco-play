const express = require("express");
const router = express.Router();

const {isAuth }= require("../../middlewares/auth.middleware");
const {isAdmin }= require("../../middlewares/admin.middleware");

const {
  addHelp,
  getAllHelp,
  updateHelp,
  deleteHelp,
  toggleHelp
} = require("../../controllers/admin/help.controller");

router.use(isAuth, isAdmin);

router.post("/", addHelp);
router.get("/", getAllHelp);
router.put("/:id", updateHelp);
router.delete("/:id", deleteHelp);
router.patch("/:id/toggle", toggleHelp);

module.exports = router;