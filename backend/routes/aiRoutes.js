const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/suggest', aiController.suggest);
router.post('/nlp', aiController.naturalLanguage);

module.exports = router;
