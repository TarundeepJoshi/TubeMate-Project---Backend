import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };

    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(404, "Video not found");
    }

    const aggregateQuery = Comment.aggregate([
      {
        $match: { video: new mongoose.Types.ObjectId(videoId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          owner: { _id: 1, fullName: 1, username: 1 },
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { commentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$comment", "$$commentId"] },
              },
            },
            {
              $project: {
                _id: 1,
                likedBy: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "likedBy",
              },
            },
            { $unwind: "$likedBy" },
            {
              $project: {
                _id: 0,
                likedBy: { _id: 1, fullName: 1, username: 1 },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          numberOfLikes: { $size: "$likes" },
        },
      },
    ]);

    const comments = await Comment.aggregatePaginate(aggregateQuery, options);
    if (!comments) {
      throw new ApiError(404, "Comments not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, comments, "Comments fetched successfully"));
  } catch (error) {
    console.error("Error while fetching video comments:", error);
    throw new ApiError(500, "Error while fetching video comments");
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(404, "Invalid video id");
  }

  try {
    const newComment = await Comment.create({
      content,
      video: videoId,
      owner: req.user._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newComment, "Comment added successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while adding comment");
  }
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const commentOwner = await Comment.findById(commentId).select("owner");
  if (commentOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  try {
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $set: { content },
      },
      { new: true }
    );
    if (!updatedComment) {
      throw new ApiError(404, "Comment not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Error while updating comment");
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const commentOwner = await Comment.findById(commentId).select("owner");
  if (commentOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  try {
    await Like.deleteMany({ comment: commentId });
    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if (!deletedComment) {
      throw new ApiError(404, "Comment not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while deleting comment");
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
