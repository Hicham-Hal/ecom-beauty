// models/Product.js
const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },   // e.g. "Rouge"
    mediaUrl: { type: String, required: true },           // photo or video of the dress in this color
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      fr: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Robes de Mariée',
        'Caftans',
        'Robes de Soirée',
        'Abayas',
        'Tenues Traditionnelles',
      ],
    },
    price: { type: Number, required: true, min: 0 },       // DZD
    preparationDays: { type: Number, required: true, min: 0 },
    sizes: {
      type: [String],
      default: [],
      set: (arr) => [...new Set(arr.map((s) => s.trim().toUpperCase()).filter(Boolean))],
    },
    images: {
      type: [String],                                      // first image = main image
      validate: [(arr) => arr.length > 0, 'At least one photo is required'],
    },
    video: { type: String, default: '' },                  // optional
    colors: { type: [colorSchema], default: [] },
    description: {
      fr: { type: String, trim: true, default: '' },
      ar: { type: String, trim: true, default: '' },
    },
    isBestSeller: { type: Boolean, default: false },       // Meilleure vente
    isNewArrival: { type: Boolean, default: false },       // Nouveauté de la saison
    inStock: { type: Boolean, default: true },             // En stock
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);