const express = require("express");
const { getHighlightPost } = require("../../controller/home/home.controller");

const router = express.Router();

router.get("/highlight-posts", getHighlightPost);

module.exports = router;