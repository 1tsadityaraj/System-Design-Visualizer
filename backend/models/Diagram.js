const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, default: 'systemNode' },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
    },
    data: {
        subtype: String,
        label: String,
        status: { type: String, default: 'healthy' },
        region: String,
        size: String,
        notes: String,
        color: String,
        type: String,
    },
}, { _id: false });

const edgeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, default: 'smoothstep' },
    animated: Boolean,
    label: String,
    style: mongoose.Schema.Types.Mixed,
}, { _id: false });

const diagramSchema = new mongoose.Schema({
    title: { type: String, required: true, default: 'Untitled Architecture' },
    description: String,
    nodes: [nodeSchema],
    edges: [edgeSchema],
    isTemplate: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isPublic: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    tags: [String],
}, { timestamps: true });

// Indexes for fast queries
diagramSchema.index({ owner: 1, updatedAt: -1 });
diagramSchema.index({ isTemplate: 1 });
diagramSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Diagram', diagramSchema);
