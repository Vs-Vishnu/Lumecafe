const mapService = require('../services/mapService');

// @desc    Geocode a manual address into coordinates
// @route   POST /api/maps/geocode
// @access  Private (Authenticated users)
exports.geocode = async (req, res, next) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ success: false, message: 'Address input is required.' });
  }

  try {
    const result = await mapService.geocodeAddress(address);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate shortest/fastest route between origin and destination
// @route   POST /api/maps/route
// @access  Private (Authenticated users)
exports.getRoute = async (req, res, next) => {
  const { origin, destination, mode = 'fastest' } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      message: 'Both origin and destination coordinates are required.',
    });
  }

  try {
    const route = await mapService.calculateRoute(origin, destination, mode);
    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
};
