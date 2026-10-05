// Import necessary modules
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const Course = require("../models/Course");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

// Create a new sub-section for a given section
exports.createSubSection = async (req, res) => {
    try {
      // Extract necessary information from the request body
      const { sectionId, title, description } = req.body
      const userId = req.user.id

      // Check if video file is provided
      if (!req.files || !req.files.video) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        })
      }
      const video = req.files.video

      // Check if all necessary fields are provided
      if (!sectionId || !title || !description) {
        return res.status(400).json({ 
          success: false, 
          message: "All fields are required" 
        })
      }

      // Check if parent section exists and user is the instructor of the course
      const sectionDetails = await Section.findById(sectionId)
      if (!sectionDetails) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        })
      }

      const courseDetails = await Course.findOne({ courseContent: sectionId })
      if (!courseDetails) {
        return res.status(404).json({
          success: false,
          message: "Associated course not found",
        })
      }

      if (courseDetails.instructor.toString() !== userId && req.user.accountType !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to modify this course",
        })
      }

      // Upload the video file to Cloudinary
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      )

      // Create a new sub-section with the necessary information
      const SubSectionDetails = await SubSection.create({
        title: title,
        timeDuration: `${uploadDetails.duration}`,
        description: description,
        videoUrl: uploadDetails.secure_url,
      })

      // Update the corresponding section with the newly created sub-section
      const updatedSection = await Section.findByIdAndUpdate(
        { _id: sectionId },
        { $push: { subSection: SubSectionDetails._id } },
        { new: true }
      ).populate({
        path: "subSection",
        strictPopulate: false,
      })

      return res.status(200).json({ success: true, data: updatedSection })
    } 
    
    catch (error) {
      console.error("Error creating new sub-section:", error)
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      })
    }
  }
  
  exports.updateSubSection = async (req, res) => {
    try {
      const { sectionId, subSectionId, title, description } = req.body
      const userId = req.user.id

      if (!sectionId || !subSectionId) {
        return res.status(400).json({
          success: false,
          message: "Section ID and SubSection ID are required",
        })
      }

      // Verify course ownership
      const courseDetails = await Course.findOne({ courseContent: sectionId })
      if (!courseDetails) {
        return res.status(404).json({
          success: false,
          message: "Associated course not found",
        })
      }

      if (courseDetails.instructor.toString() !== userId && req.user.accountType !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to modify this course",
        })
      }

      const subSection = await SubSection.findById(subSectionId)
      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: "SubSection not found",
        })
      }

      if (title !== undefined) {
        subSection.title = title
      }

      if (description !== undefined) {
        subSection.description = description
      }

      if (req.files && req.files.video !== undefined) {
        const video = req.files.video
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME)
        subSection.videoUrl = uploadDetails.secure_url
        subSection.timeDuration = `${uploadDetails.duration}`
      }

      await subSection.save()

      const updatedSection = await Section.findById(sectionId).populate("subSection")

      return res.status(200).json({
        success: true,
        data: updatedSection,
        message: "Section updated successfully",
      })
    } 
    
    catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating the section",
      })
    }
  }
  
  exports.deleteSubSection = async (req, res) => {
    try {
      const { subSectionId, sectionId } = req.body
      const userId = req.user.id

      if (!subSectionId || !sectionId) {
        return res.status(400).json({
          success: false,
          message: "Section ID and SubSection ID are required",
        })
      }

      // Verify course ownership
      const courseDetails = await Course.findOne({ courseContent: sectionId })
      if (!courseDetails) {
        return res.status(404).json({
          success: false,
          message: "Associated course not found",
        })
      }

      if (courseDetails.instructor.toString() !== userId && req.user.accountType !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to modify this course",
        })
      }

      // before deleting subsection(video) we should delete the videos from cloudinary first through a function
      const subSection = await SubSection.findByIdAndDelete(subSectionId)
      if (!subSection) {
        return res.status(404).json({ 
          success: false, 
          message: "SubSection not found" 
        })
      }

      
      const updatedSection = await Section.findByIdAndUpdate(
        sectionId,
        {
          $pull: {
            subSection: subSectionId,
          },
        },
        { new: true }
      ).populate("subSection")

      return res.status(200).json({
        success: true,
        data: updatedSection,
        message: "SubSection deleted successfully",
      })
    } 
    
    catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "An error occurred while deleting the SubSection",
      })
    }
  }