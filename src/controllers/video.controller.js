import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  //TODO: get all videos based on query, sort, pagination

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy: sortBy
      ? { [sortBy]: sortType === "desc" ? -1 : 1 }
      : { createdAt: -1 },
  };

  const conditions = {};
  if (query) {
    conditions.title = { $regex: query, $options: "i" };
    conditions.description = { $regex: query, $options: "i" };
  }

  if (userId) {
    conditions.owner = userId;
  }

  const videos = await Video.aggregatePaginate(conditions, options);

  for (let video of videos.docs) {
    const likes = await Like.find({ video: video._id }).populate(
      "likedBy",
      "fullName username"
    );

    video.likes = likes.map((like) => like.likedBy);

    const owner = await User.findById(video.owner).select("fullName username");
    video.owner = owner;
  }

  if (!videos) {
    console.log("error in fetching videos");
    throw new ApiError(500, "error in fetching videos");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, "videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
