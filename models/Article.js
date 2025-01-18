const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imgSrc: { type: String }, // Optional image
    altText: { type: String },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    category: { type: String, required: true }
});

module.exports = mongoose.model('Article', articleSchema);
