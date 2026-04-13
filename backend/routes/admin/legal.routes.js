const express = require("express");
const router = express.Router();
const {isAuth} = require("../../middlewares/auth.middleware");
const {isAdmin} = require("../../middlewares/admin.middleware");
const { getLegalDocuments,getLegalByType,addOrUpdateLegalDocument, togglePublish } = require("../../controllers/admin/legal.controller");    
router.use(isAuth, isAdmin);

//Get all legal documents
router.get("/", getLegalDocuments);                         // GET   /api/admin/legal
//Get legal document by type
router.get("/:type", getLegalByType);                // GET   /api/admin/legal/:type    
//Add or update legal document
router.put("/:type", addOrUpdateLegalDocument);                   // PUT   /api/admin/legal/:type
//Toggle publish status
router.patch("/:type/toggle", togglePublish);        // PATCH /api/admin/legal/:type/toggle

// User routes (no auth needed)

const {
  getLegalForUser,
  getLegalByTypeForUser
} = require("../../controllers/legal.controller");

// No auth needed (public)
router.get("/", getLegalForUser);
router.get("/:type", getLegalByTypeForUser);

module.exports = router;


module.exports = router;
