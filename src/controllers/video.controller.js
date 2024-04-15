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

  if (!title || description) {
    console.error("Error: Title or description is missing");
    throw new ApiError(400, "Title and description is required");
  }

  const userId = req.user?._id;

  const videoFilePath = req.files?.videoFile[0]?.path;
  const thumbnailFilePath = req.files?.thumbnail[0]?.path;

  const videoFile = await uploadOnCloudinary(videoFilePath);
  const thumbnail = await uploadOnCloudinary(thumbnailFilePath);

  const videoDuration = videoFile?.duration;

  if (!thumbnail) {
    throw new ApiError(400, "Failed to upload thumbnail");
  }
  if (!videoFile) {
    throw new ApiError(400, "Failed to upload video file");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.secure_url,
    thumbnail: thumbnail.secure_url,
    duration: videoDuration,
    owner: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!(video.trim() || isValidObjectId(videoId))) {
    throw new ApiError(400, "video is not found");
  }

  const numberOfLikes = await Like.countDocuments({ video: videoId });
  const numberOfComments = await Comment.countDocuments({ video: videoId });

  const video = await Video.findById(videoId)
    .populate({
      path: "owner",
      select: "fullname username",
    })
    .select("-__v -updatedAt");

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: { watchHistory: videoId },
    },
    { new: true }
  );

  await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: { views: 1 },
    },
    { new: true }
  );

  const videoWithNumberOfLikesAndComments = {
    ...video.toObject(),
    numberOfLikes: numberOfLikes,
    numberOfComments: numberOfComments,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoWithNumberOfLikesAndComments,
        "Video found successfully"
      )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  const userId = req.user?._id;
  const { title, description } = req.body;
  const thumbnailFilePath = req.files?.path;

  if (!thumbnailFilePath) {
    throw new ApiError(400, "thumbnail is required");
  }
  if (!(video.trim() || isValidObjectId(videoId))) {
    throw new ApiError(400, "video is not found");
  }

  const videoOwner = await Video.findById(videoId)
    .select("owner thumbnail")
    .exec();
  console.log("video owner: ", videoOwner);
  if (!videoOwner || videoOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(
      403,
      "Video not found || You are not the owner of this video"
    );
  }

  await deleteFileFromCloudinary(videoOwner.thumbnail, false);

  const thumbnail = await uploadOnCloudinary(thumbnailFilePath);

  if (!thumbnail.secure_url) {
    throw new ApiError(400, "Error while updating thumbnail");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.secure_url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Thumbnail updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!(videoId.trim() || isValidObjectId(videoId))) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }

  try {
    await Like.deleteMany({ video: videoId });

    const comments = await comments.find({ video: videoId });
    const commentsIds = comments.map((comment) => comment._id);

    await Comment.deleteMany({ video: videoId });
    await Like.deleteMany({ comment: { $in: commentsIds } });

    await Playlist.updateMany(
      {
        videos: videoId,
      },
      {
        $pull: {
          videos: videoId,
        },
      }
    );

    await User.updateMany(
      { watchHistory: videoId },
      { $pull: { watchHistory: videoId } }
    );

    await deleteFileFromCloudinary(video.videoFile, true);
    await deleteFileFromCloudinary(video.thumbnail, false);

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, null, "Video deleted"));
  } catch (error) {
    console.error("Error while deleting video", error);
    throw new ApiError(500, "Error while deleting video");
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!(videoId.trim() || isValidObjectId(videoId))) {
    throw new ApiError(400, "Invalid video id");
  }

  const videoOwner = await Video.findById(videoId).select("owner").exec();
  if (!videoOwner || videoOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(
      403,
      "Video Not found || You are not owner of this video"
    );
  }

  const video = await Video.findById(videoId).select("-owner").exec();
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;

  const updatedVideo = await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video publish status updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
