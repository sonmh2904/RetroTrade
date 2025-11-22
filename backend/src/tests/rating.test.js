// __tests__/rating.controller.test.js
const request = require("supertest");
const express = require("express");

// Controller
const { createRating } = require("../controller/order/rating.controller");

// Model & Upload function (mock)
const Rating = require("../models/Order/Rating.model");
const uploadToCloudinary = require("../middleware/upload.middleware");

// Mock DB + Cloudinary
jest.mock("../models/Order/Rating.model");
jest.mock("../middleware/upload.middleware", () => ({
  uploadToCloudinary: jest.fn(), 
}));

const app = express();
app.use(express.json());
app.post("/api/v1/products/rating", createRating);

test("Thiếu thông tin → trả 400", async () => {
  const res = await request(app).post("/api/v1/products/ratings").send({
    orderId: "6741a2f0d9a019d70a9f1bb1",
    itemId: "6741a2f0d9a019d70a9f1bb2",
    // thiếu renterId + rating
  });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toBe("Thiếu thông tin cần thiết.");
});

test("Đã đánh giá rồi → trả 400", async () => {
  Rating.findOne.mockResolvedValue({
    _id: "existingId",
  });

  const res = await request(app).post("/api/v1/products/ratings").send({
    orderId: "6741a2f0d9a019d70a9f1bb1",
    itemId: "6741a2f0d9a019d70a9f1bb2",
    renterId: "6741a2f0d9a019d70a9f1bb3",
    rating: 5,
    comment: "Nice",
  });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toBe("Bạn đã đánh giá sản phẩm này rồi.");
});

test("Tạo đánh giá không có ảnh → trả 201", async () => {
  Rating.findOne.mockResolvedValue(null);

  Rating.create.mockResolvedValue({
    _id: "newRatingId",
    orderId: "6741a2f0d9a019d70a9f1bb1",
    itemId: "6741a2f0d9a019d70a9f1bb2",
    renterId: "6741a2f0d9a019d70a9f1bb3",
    rating: 5,
    comment: "Perfect",
    images: [],
    isEdited: false,
    isDeleted: false,
  });

  const res = await request(app).post("/api/v1/products/ratings").send({
    orderId: "6741a2f0d9a019d70a9f1bb1",
    itemId: "6741a2f0d9a019d70a9f1bb2",
    renterId: "6741a2f0d9a019d70a9f1bb3",
    rating: 5,
    comment: "Perfect",
  });

  expect(res.statusCode).toBe(201);
  expect(res.body.message).toBe("Đánh giá thành công!");
  expect(res.body.rating._id).toBe("newRatingId");
});

test("Tạo đánh giá có ảnh → 201", async () => {
  Rating.findOne.mockResolvedValue(null);

  uploadToCloudinary.mockResolvedValue([
    { Url: "https://cloudinary.com/img1.jpg" },
    { Url: "https://cloudinary.com/img2.jpg" },
  ]);

  Rating.create.mockResolvedValue({
    _id: "newId",
    images: [
      "https://cloudinary.com/img1.jpg",
      "https://cloudinary.com/img2.jpg",
    ],
  });

  const res = await request(app).post("/api/v1/products/rating").send({
    orderId: "6741a2f0d9a019d70a9f1bb1",
    itemId: "6741a2f0d9a019d70a9f1bb2",
    renterId: "6741a2f0d9a019d70a9f1bb3",
    rating: 5,
    comment: "Perfect!",
  });

  expect(res.statusCode).toBe(201);
  expect(res.body.rating.images.length).toBe(2);
});


test("Lỗi server → trả 500", async () => {
  Rating.findOne.mockRejectedValue(new Error("DB crashed"));

  const res = await request(app).post("/api/v1/products/ratings").send({
    orderId: "6741a2f0d9a019d70a9f1bb1",
    itemId: "6741a2f0d9a019d70a9f1bb2",
    renterId: "6741a2f0d9a019d70a9f1bb3",
    rating: 3,
  });

  expect(res.statusCode).toBe(500);
  expect(res.body.message).toBe("Lỗi khi tạo đánh giá.");
});
