import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video
  try {
    const { videoId } = req.params;
    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
      throw new ApiError("Video does not exist");
    }

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video id");
    }

    const existingLike = await Video.findOneAndDelete({
      video: videoId,
      likedBy: req.user._id,
    });

    if (existingLike) {
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Video unliked successfully"));
    } else {
      const newLike = new Like({ video: videoId, likedBy: req.user._id });
      const savedLike = await newLike.save();

      return res
        .status(201)
        .json(new ApiResponse(201, savedLike, "Video liked successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Error while toggling video like");
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;
  const commentExits = await Comment.exists({ _id: commentId });
  if (!commentExits) {
    throw new ApiError(404, "Comment does not exist");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  try {
    const existingLike = await Like.findOneAndDelete({
      comment: commentId,
      likedBy: req.user._id,
    });

    if (existingLike) {
      throw new ApiResponse(200, null, "Comment unliked successfully");
    } else {
      const newLike = new Like({
        comment: commentId,
        likedBy: req.user._id,
      });
      const saveLike = await newLike.save();

      return res
        .status(201)
        .json(new ApiResponse(201, saveLike, "Comment liked successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Error while toggling comment like");
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on tweet
  const { tweetId } = req.params;
  const tweetExits = await Tweet.exists({ _id: tweetId });
  if (!tweetExits) {
    throw new ApiError(404, "Tweet does not exits");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  try {
    const existingLike = await Like.findOneAndDelete({
      tweet: tweetId,
      likedBy: req.user._id,
    });
    if (existingLike) {
      return res
        .status(200)
        .json(new ApiResponse(201, null, "Tweet unliked successfully"));
    } else {
      const newLike = new Like({
        tweet: tweetId,
        likedBy: req.user._id,
      });
      const savedLike = await newLike.save();

      return res
        .status(201)
        .json(new ApiResponse(201, savedLike, "Tweet liked successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Error while toggle tweet like");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  try {
    const likedVideos = await Like.find({
      likedBy: req.user._id,
    })
      .populate({
        path: "video",
        populate: {
          path: "owner",
          select: "username fullName",
        },
      })
      .populate({
        path: "likedBy",
        select: "username fullname",
      });

    const filteredLikedVideos = likedVideos.filter(
      (entry) => entry.video !== null && entry.video !== undefined
    );

    if (filteredLikedVideos.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No liked videos found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          filteredLikedVideos,
          "Liked videos retrieved successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error while getting liked videos");
  }
});

const getLikedTweets = asyncHandler(async (req, res) => {
  try {
    const likedTweets = await Like.find({ likedBy: req.user._id })
      .populate({
        path: "tweet",
        populate: {
          path: "owner",
          select: "username fullName",
        },
      })
      .populate({
        path: "likedBy",
        select: "username fullName",
      });

    const filteredLikedTweets = likedTweets.filter(
      (entry) => entry.tweet !== null && entry.tweet !== undefined
    );

    if (filteredLikedTweets.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No liked tweets found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          filteredLikedTweets,
          "Liked tweets retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error while getting liked tweets:", error);
    throw new ApiError(500, "Error while getting liked tweets");
  }
});

const getLikedComments = asyncHandler(async (req, res) => {
  try {
    const likedComments = await Like.find({ likedBy: req.user._id })
      .populate({
        path: "comment",
        populate: {
          path: "owner",
          select: "username fullName",
        },
      })
      .populate({
        path: "likedBy",
        select: "username fullName",
      });

    const filteredLikedComments = likedComments.filter(
      (entry) => entry.comment !== null && entry.comment !== undefined
    );

    if (filteredLikedComments.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No liked comments found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          filteredLikedComments,
          "Liked comments retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error while getting liked comments:", error);
    throw new ApiError(500, "Error while getting liked comments");
  }
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  getLikedTweets,
  getLikedComments,
};
