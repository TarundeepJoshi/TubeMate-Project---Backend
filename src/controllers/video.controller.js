import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Playlist } from "../models/playlist.models.js"; // Add this import
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFileFromCloudinary } from "../utils/cloudinary.js";

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

  if (!title || !description) {
    // Changed condition here
    throw new ApiError(400, "Title and description are required");
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

  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    // Fixed condition
    throw new ApiError(400, "Invalid video ID");
  }

  const numberOfLikes = await Like.countDocuments({ video: videoId });
  const numberOfComments = await Comment.countDocuments({ video: videoId });

  const video = await Video.findById(videoId) // Moved video declaration up
    .populate({
      path: "owner",
      select: "fullname username",
    })
    .select("-__v -updatedAt");

  if (!video) {
    throw new ApiError(404, "Video not found");
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
  const { videoId } = req.params;
  const userId = req.user?._id;
  const { title, description } = req.body;
  const thumbnailFilePath = req.file?.path;  // Changed from req.files?.path

  if (!videoId?.trim() || !isValidObjectId(videoId)) {  // Fixed validation
    throw new ApiError(400, "Invalid video ID");
  }

  const videoOwner = await Video.findById(videoId)
    .select("owner thumbnail")
    .exec();

  if (!videoOwner || videoOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Video not found || You are not the owner of this video");
  }

  const updateFields = {};
  
  if (title) updateFields.title = title;
  if (description) updateFields.description = description;
  
  if (thumbnailFilePath) {
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
    if (!thumbnail.url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }
    
    // Delete old thumbnail before setting new one
    if (videoOwner.thumbnail) {
      await deleteFileFromCloudinary(videoOwner.thumbnail);
    }
    
    updateFields.thumbnail = thumbnail.url;
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updateFields
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!videoId?.trim() || !isValidObjectId(videoId)) {  // Fixed validation
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }

  try {
    // Delete likes associated with the video
    await Like.deleteMany({ video: videoId });

    // Find and delete comments and their associated likes
    const videoComments = await Comment.find({ video: videoId });
    const commentIds = videoComments.map((comment) => comment._id);
    
    await Comment.deleteMany({ video: videoId });
    if (commentIds.length > 0) {
      await Like.deleteMany({ comment: { $in: commentIds } });
    }

    // Remove video from playlists
    await Playlist.updateMany(
      { videos: videoId },
      { $pull: { videos: videoId } }
    );

    // Remove video from watch history
    await User.updateMany(
      { watchHistory: videoId },
      { $pull: { watchHistory: videoId } }
    );

    // Delete files from cloudinary
    if (video.videoFile) {
      await deleteFileFromCloudinary(video.videoFile, true);
    }
    if (video.thumbnail) {
      await deleteFileFromCloudinary(video.thumbnail, false);
    }

    // Finally delete the video document
    await Video.findByIdAndDelete(videoId);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Video deleted successfully"));
      
  } catch (error) {
    console.error("Error while deleting video:", error);
    throw new ApiError(500, `Error while deleting video: ${error.message}`);
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
