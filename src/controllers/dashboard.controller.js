import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  try {
    const channelId = req.user?._id;

    const totalVideoViews = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: "$views",
          },
        },
      },
    ]);

    const totalSubscribers = await Subscription.countDocuments({
      channel: channelId,
    });

    const totalVideos = await Video.countDocuments({
      owner: channelId,
    });

    const channelVideos = await Video.find(
      {
        owner: channelId,
      },
      "_id"
    );

    const channelVideoId = channelVideos.map((video) => video._id);

    const totalVideoLikes = await Like.countDocuments({
      video: { $in: channelVideoIds },
    });

    return res.status(200).json({
      totalVideoViews:
        totalVideoViews.length > 0 ? totalVideoViews[0].totalViews : 0,
      totalSubscribers,
      totalVideos,
      totalVideoLikes,
    });
  } catch (error) {
    throw new ApiError(500, "Error while fetching channel stats");
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const channelId = req.user._id;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  try {
    const videos = await Video.find({ owner: channelId });
    return res
      .status(200)
      .json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
      );
  } catch (error) {
    console.error("Error while getting channel videos:", error);
    throw new ApiError(500, "Error while getting channel videos");
  }
});

export { getChannelStats, getChannelVideos };
