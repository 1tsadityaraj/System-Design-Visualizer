const express = require('express');
const router = express.Router();
const diagramController = require('../controllers/diagramController');

router.get('/', diagramController.getAllDiagrams);
router.get('/templates', diagramController.getTemplates);
router.get('/:id', diagramController.getDiagramById);
router.post('/', diagramController.createDiagram);
router.put('/:id', diagramController.updateDiagram);
router.delete('/:id', diagramController.deleteDiagram);

module.exports = router;
