const express= require("express");
const router= express.Router();

const { getLegalForUser, getLegalByTypeForUser } = require("../../controllers/legal.controller");

// No auth needed (public)
router.get("/", getLegalForUser);
router.get("/:type", getLegalByTypeForUser);    
module.exports=router;