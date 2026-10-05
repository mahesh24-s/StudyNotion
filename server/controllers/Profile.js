const Profile = require("../models/Profile")
const CourseProgress = require("../models/CourseProgress")
const RatingAndReview = require("../models/RatingAndReview");

const Course = require("../models/Course")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const mongoose = require("mongoose")
const { convertSecondsToDuration } = require("../utils/secToDuration")
// Method for updating a profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      about,
      contactNumber,
      gender,
    } = req.body
    const id = req.user.id

    // Find the user and profile
    const userDetails = await User.findById(id)
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const profile = await Profile.findById(userDetails.additionalDetails)
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      })
    }

    const userUpdates = {}
    if (firstName !== undefined) userUpdates.firstName = firstName
    if (lastName !== undefined) userUpdates.lastName = lastName
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(id, userUpdates)
    }

    // Update the profile fields only if provided
    if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth
    if (about !== undefined) profile.about = about
    if (contactNumber !== undefined) profile.contactNumber = contactNumber
    if (gender !== undefined) profile.gender = gender

    // Save the updated profile
    await profile.save()

    // Find the updated user details
    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    return res.json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    })
  } 
  
  catch (error) {
    // //console.log(error)
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id;

    // here we are deleting the user assuming the user is not instructor or admin and deleting the student's enrolled courses only, the case for if the user is instructor or admin is not handled.

    // //console.log(id)
    const user = await User.findById({ _id: id })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }
    // Delete Assosiated Profile with the User
    await Profile.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(user.additionalDetails),
    })

    for (const courseId of user.courses) {
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnrolled: id } },
        { new: true }
      )
    }

    // Clean up associated data
    await CourseProgress.deleteMany({ userId: id })
    await RatingAndReview.deleteMany({ user: id })

    // Now Delete User
    await User.findByIdAndDelete({ _id: id })
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
  } 
  
  catch (error) {
    // console.log(error)
    res.status(500).json({ 
      success: false, 
      message: "User Cannot be deleted successfully" 
    })
  }
}

exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id
    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()
    // //console.log(userDetails)
    res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    })
  } 
  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture
    const userId = req.user.id
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    )
    // //console.log(image)
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } 
  
  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id
    let userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec();

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: `Could not find user with id: ${userId}`,
      })
    }
  
    userDetails = userDetails.toObject()
    // Filter out any courses that may have been deleted from the database
    userDetails.courses = (userDetails.courses || []).filter((course) => course != null)

    for (var i = 0; i < userDetails.courses.length; i++) {
        let totalDurationInSeconds = 0
        let SubsectionLength = 0
        const courseContent = userDetails.courses[i].courseContent || []
        
        for (var j = 0; j < courseContent.length; j++) {
          const subSections = courseContent[j].subSection || []
          totalDurationInSeconds += subSections.reduce(
            (acc, curr) => acc + (parseInt(curr?.timeDuration, 10) || 0),
            0
          )
          
          SubsectionLength += subSections.length
        }

        userDetails.courses[i].totalDuration = convertSecondsToDuration(totalDurationInSeconds)

        let courseProgressCount = await CourseProgress.findOne({
          courseID: userDetails.courses[i]._id,
          userId: userId,
        })

        const completedCount = courseProgressCount?.completedVideos?.length || 0

        if (SubsectionLength === 0) {
          userDetails.courses[i].progressPercentage = 100
        } 

        else {
          // To make it up to 2 decimal point
          const multiplier = Math.pow(10, 2)
          userDetails.courses[i].progressPercentage =
            Math.round(
              (completedCount / SubsectionLength) * 100 * multiplier
            ) / multiplier
        }
    }

    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    })
  } 
  
  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id })

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnrolled.length
      const totalAmountGenerated = totalStudentsEnrolled * course.price

      // Create a new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        // Include other course properties as needed
        totalStudentsEnrolled,
        totalAmountGenerated,
      }

      return courseDataWithStats
    })

    res.status(200).json({ courses: courseData })
  } 
  
  catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
