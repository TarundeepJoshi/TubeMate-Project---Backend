import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist
  const { name, description } = req.body;
  const userId = req.user?._id;

  if (!(name || description)) {
    console.log("All fields are required");
  }

  try {
    const playlist = await Playlist.create({
      name,
      description,
      owner: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Playlist created successfully"));
  } catch (error) {
    console.log("Error while creating playlist");
    throw new ApiError(500, "Error while creating playlist");
  }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!isValidObjectId(userId)) {
    console.log("Invalid user id");
  }

  try {
    const playlists = await Playlist.find({ owner: userId }).populate({
      path: "videos",
      select: "-owner -__v -createdAt -updatedAt",
    });

    if (!playlists) {
      throw new ApiError(400, "Playlist is not available");
    }

    return res
      .status(200)
      .json(200, playlists, "User playlist fetched successfully");
  } catch (error) {
    console.log("Error while fetching user playlists");
    throw new ApiError(500, "Error while fetching user playlists");
  }
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId)) {
    console.log("invalid playlist id");
  }

  try {
    const playlist = await Playlist.findById(playlistId).populate({
      path: "videos",
      select: "-__v -createdAt -updatedAt",
    });

    if (!playlist) {
      console.log("playlist not found");
      throw new ApiError(404, "playlist not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
  } catch (error) {
    console.log("error while fetching playlist");
    throw new ApiError(500, "error while fetching playlist");
  }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    console.log("Invalid playlist id or video id");
  }

  const videoExists = await Video.findById({ _id: videoId });
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const playlist = await Playlist.findById(playlistId).select("owner");
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to add video to this playlist"
    );
  }

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $addToSet: { videos: videoId },
      },
      { new: true }
    );

    if (!updatedPlaylist) {
      throw new ApiError(404, "Playlist not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedPlaylist,
          "video added to playlist successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "error while adding video to playlist");
  }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // TODO: remove video from playlist
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!(isValidObjectId(playlistId) || isValidObjectId(videoId))) {
    console.log("Invalid playlist or video id");
  }
  const playlist = await Playlist.findById(playlistId).select("owner");
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to remove video from this playlist"
    );
  }

  try {
    const removeVideo = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $pull: { videos: videoId },
      },
      {
        new: true,
      }
    );
    if (!removeVideo) {
      throw new ApiError(404, "Playlist not found or video is not in playlist");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          removeVideo,
          "video removed from playlist successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "error while removing video from playlist");
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  // TODO: delete playlist
  const { playlistId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(playlistId)) {
    console.log("invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId).select("owner");
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  try {
    const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);
    if (!deletePlaylist) {
      throw new ApiError(404, "Playlist not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "playlist deleted successfully"));
  } catch (error) {
    console.log("error while deleting playlist");
    throw new ApiError(500, "error while deleting playlist");
  }
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //TODO: update playlist
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?._id;

  if (!isValidObjectId(playlistId)) {
    console.log("invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId).select("owner");
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $set: { name, description },
      },
      { new: true }
    );
    if (!updatedPlaylist) {
      throw new ApiError(404, "Playlist not found");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedPlaylist, "playlist updated successfully")
      );
  } catch (error) {
    throw new ApiError(500, "error while updating playlist");
  }
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
