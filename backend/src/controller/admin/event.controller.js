const Event = require("../../models/Event.model.js");
const { uploadToCloudinary } = require("../../middleware/upload.middleware.js");

// GET: Lấy tất cả events (cho admin)
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("createdBy", "fullName email")
      .sort({ startDate: -1 });
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET: Lấy event hiện tại (public)
exports.getCurrentEvent = async (req, res) => {
  try {
    const now = new Date();
    const event = await Event.findOne({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, event: event || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST: Tạo event mới
exports.createEvent = async (req, res) => {
  try {
    const newEvent = new Event({
      ...req.body,
      createdBy: req.user.id,
    });
    await newEvent.save();
    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT: Cập nhật event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, data: updatedEvent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE: Xóa event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(id);
    if (!deletedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH: Toggle isActive
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    event.isActive = !event.isActive;
    await event.save();
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST: Upload ảnh đặc trưng cho event
exports.uploadFeatureImage = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Không có file được upload" });
    }

    const uploaded = await uploadToCloudinary([req.file], "event-feature/");

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { "theme.featureImageUrl": uploaded[0].Url },
      { new: true }
    );

    if (!updatedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sự kiện" });
    }

    res.status(200).json({ success: true, data: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
