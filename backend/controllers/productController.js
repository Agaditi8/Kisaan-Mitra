const Product = require('../models/Product');

// @desc    Create a new produce listing
// @route   POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const { farmerId, cropName, quantity, qualityGrade, askingPrice, images, location } = req.body;

    // TODO: Integration Point for Person 3 (AI Price Assistant)
    // const aiPrice = await axios.post('http://person3-api/recommend', { cropName, quantity });
    // if (!askingPrice) askingPrice = aiPrice.recommended;

    const newProduct = new Product({
      farmerId,
      cropName,
      quantity,
      qualityGrade,
      askingPrice,
      images,
      location: {
        type: 'Point',
        coordinates: [location.long, location.lat] // GeoJSON format
      }
    });

    await newProduct.save();
    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all available products
// @route   GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'available' }).populate('farmerId', 'name phone');
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};