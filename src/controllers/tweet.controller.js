import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  try {
    const { content } = req.body;
    const userId = req.user?._id;
    if (!content) {
      throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
      content,
      owner: userId,
    });

    return res.status(200).json(200, tweet, "Tweet created successfully");
  } catch (error) {
    throw new ApiError(500, "Error while creating tweet");
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const userId = req.user?._id;

  try {
    const tweets = await Tweet.find({ owner: userId });

    const numberOfLikesOnTweets = {};
    const likedBy = {};

    for (const tweet of tweets) {
      await tweet.populate("owner", "fullname");

      const likes = await likedBy
        .find({
          tweet: tweet._id,
        })
        .populate("likedBy", "fullname");

      numberOfLikesOnTweets[tweet._id] = likes.length;
      likedBy[tweet._id] = likes.map((like) => like.likedBy.fullname);
    }

    const tweetWithLikes = tweets.map((tweet) => ({
      ...tweet.toObject(),
      numberOfLikes: numberOfLikesOnTweets[tweet._id],
      likedBy: likedBy[tweet._id],
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(200, tweetWithLikes, "User tweets fetched Successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Error fetching user tweets");
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { updateContent } = req.body;
  const userId = req.user?._id;
  const tweetId = req.params.tweetId;

  if (!updateContent) {
    throw new ApiError(400, "Content is required");
  }
  if (!isValidObjectId(tweetId)) {
    console.log("Invalid tweet ID");
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweetOwner = await Tweet.findById(tweetId).select("owner");
  if (!tweetOwner) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweetOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized to update tweet");
  }

  try {
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content: updateContent,
        },
      },
      { new: true }
    );

    if (!updatedTweet) {
      console.log("error: tweet not updated");
      throw new ApiError(404, "Error while updating tweet");
    }

    return res
      .status(200)
      .json(new ApiResponse(201, updatedTweet, "Tweet updated Successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while updating tweet");
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const tweetId = req.params.tweetId;
  const userId = req.user._id;
  try {
    const tweetOwner = await Tweet.findById(tweetId).select("owner");
    if (!tweetOwner) {
      throw new ApiError(404, "Tweet not found");
    }

    if (tweetOwner.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "Unauthorized to delete tweet");
    }

    await Like.deleteMany({ tweet: tweetId });
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
      throw new ApiError(500, "Tweet not found or deleted");
    }

    return res
      .status(200)
      .json(new ApiResponse(201, null, "Tweet deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while deleting tweet");
  }
});

const getAllTweets = asyncHandler(async (req, res) => {
  try {
    const tweetsWithLikes = await Tweet.aggregate([
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails",
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          owner: {
            _id: "$owner",
            fullName: { $arrayElemAt: ["$ownerDetails.fullName", 0] },
          },
          createdAt: 1,
          likes: {
            $map: {
              input: "$likes",
              as: "like",
              in: "$$like.likedBy",
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "likes",
          foreignField: "_id",
          as: "likedBy",
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          owner: 1,
          createdAt: 1,
          numberOfLikes: { $size: "$likes" },
          likedBy: {
            _id: 1,
            fullName: 1,
          },
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, tweetsWithLikes, "All tweets fetched successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Error fetching all tweets");
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getAllTweets };
