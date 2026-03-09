const Diagram = require('../models/Diagram');

exports.getAllDiagrams = async (req, res) => {
    try {
        const diagrams = await Diagram.find().sort('-updatedAt');
        res.json(diagrams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTemplates = async (req, res) => {
    try {
        const templates = await Diagram.find({ isTemplate: true });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDiagramById = async (req, res) => {
    try {
        const diagram = await Diagram.findById(req.params.id);
        if (!diagram) return res.status(404).json({ message: 'Diagram not found' });
        res.json(diagram);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createDiagram = async (req, res) => {
    try {
        const newDiagram = new Diagram(req.body);
        const savedDiagram = await newDiagram.save();
        res.status(201).json(savedDiagram);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateDiagram = async (req, res) => {
    try {
        const updatedDiagram = await Diagram.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedDiagram) return res.status(404).json({ message: 'Diagram not found' });
        res.json(updatedDiagram);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteDiagram = async (req, res) => {
    try {
        const deletedDiagram = await Diagram.findByIdAndDelete(req.params.id);
        if (!deletedDiagram) return res.status(404).json({ message: 'Diagram not found' });
        res.json({ message: 'Diagram deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
