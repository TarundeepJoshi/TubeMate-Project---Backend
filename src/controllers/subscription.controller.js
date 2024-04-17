import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  // TODO: toggle subscription
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "invalid channel Id");
  }

  if (channelId === userId.toString()) {
    throw new ApiError(404, "User can't subscribe his own channel");
  }

  try {
    const existingSubscription = await Subscription.findOne({
      channel: channelId,
      subscriber: userId,
    });

    if (existingSubscription) {
      await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: userId,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(
            201,
            { message: "User unsubscribed" },
            "User unsubscribed the channel successfully"
          )
        );
    } else {
      await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });
      return res
        .status(200)
        .json(
          new ApiResponse(
            201,
            { message: "User subscribed" },
            "User subscribed the channel Successfully"
          )
        );
    }
  } catch (error) {
    throw new ApiError(500, "error while toggling the subsription");
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }
  if (channelId !== userId.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to view subscribers of this channel"
    );
  }

  try {
    const subscriptions = await Subscription.find({
      channel: channelId,
    }).populate({
      path: "subscriber",
      select:
        "-refreshToken -password -email -createdAt -updatedAt -__v -watchHistory",
    });

    const subscribers = subscriptions.map(
      (subscription) => subscription.subscriber
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribers,
          "List of subscribers who has subscribed to this channel"
        )
      );
  } catch (error) {
    throw new ApiError(404, "error while fetching subscribers details");
  }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  try {
    const subscriptions = await Subscription.find({
      subscriber: subscriberId,
    }).populate({
      path: "channel",
      select:
        "-refreshToken -password -email -createdAt -updatedAt -__v -watchHistory",
    });

    const channels = subscriptions.map((subscription) => subscription.channel);

    return res
      .status(200)
      .json(
        new ApiResponse(200, channels, "list of channels user subscribed to")
      );
  } catch (error) {
    throw new ApiError(404, "error while fetching channels details");
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
