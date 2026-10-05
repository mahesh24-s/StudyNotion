const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");
// CREATE a new section
exports.createSection = async (req, res) => {
	try {
		// Extract the required properties from the request body
		const { sectionName, courseId } = req.body;
		const userId = req.user.id;

		// Validate the input
		if (!sectionName || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			});
		}

		// Verify course ownership
		const courseDetails = await Course.findById(courseId);
		if (!courseDetails) {
			return res.status(404).json({
				success: false,
				message: "Course not found",
			});
		}

		if (courseDetails.instructor.toString() !== userId && req.user.accountType !== "Admin") {
			return res.status(403).json({
				success: false,
				message: "You are not authorized to modify this course",
			});
		}

		// Create a new section with the given name
		const newSection = await Section.create({ sectionName });

		// Add the new section to the course's content array
		const updatedCourse = await Course.findByIdAndUpdate(
			courseId,
			{
				$push: {
					courseContent: newSection._id,
				},
			},
			{ new: true }
		)
			.populate({
				path: "courseContent",
				populate: {
					path: "subSection",
					strictPopulate: false,
				},
			})
			.exec();

		// Return the updated course object in the response
		res.status(200).json({
			success: true,
			message: "Section created successfully",
			updatedCourse,
		});
	} 
	
	catch (error) {
		// Handle errors
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// UPDATE a section
exports.updateSection = async (req, res) => {
	try {
		const { sectionName, sectionId, courseId } = req.body;
		const userId = req.user.id;

		if (!sectionName || !sectionId || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			});
		}

		// Verify course ownership
		const courseDetails = await Course.findById(courseId);
		if (!courseDetails) {
			return res.status(404).json({
				success: false,
				message: "Course not found",
			});
		}

		if (courseDetails.instructor.toString() !== userId && req.user.accountType !== "Admin") {
			return res.status(403).json({
				success: false,
				message: "You are not authorized to modify this course",
			});
		}

		const section = await Section.findByIdAndUpdate(
			sectionId,
			{ sectionName },
			{ new: true }
		);

		const course = await Course.findById(courseId)
			.populate({
				path: "courseContent",
				populate: {
					path: "subSection",
				},
			})
			.exec();

		res.status(200).json({
			success: true,
			message: "Section updated successfully",
			data: course,
		});
	} catch (error) {
		console.error("Error updating section:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

// DELETE a section
exports.deleteSection = async (req, res) => {
	try {
		const { sectionId, courseId } = req.body;
		const userId = req.user.id;

		if (!sectionId || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			});
		}

		// Verify course ownership
		const courseDetails = await Course.findById(courseId);
		if (!courseDetails) {
			return res.status(404).json({
				success: false,
				message: "Course not found",
			});
		}

		if (courseDetails.instructor.toString() !== userId && req.user.accountType !== "Admin") {
			return res.status(403).json({
				success: false,
				message: "You are not authorized to modify this course",
			});
		}

		const section = await Section.findById(sectionId);
		if (!section) {
			return res.status(404).json({
				success: false,
				message: "Section not Found",
			});
		}

		// Delete sub section
		// before deleting subsections(videos) we should delete the videos from cloudinary first through a function
		await SubSection.deleteMany({ _id: { $in: section.subSection } });

		await Section.findByIdAndDelete(sectionId);

		const course = await Course.findByIdAndUpdate(
			courseId,
			{
				$pull: {
					courseContent: sectionId,
				},
			},
			{ new: true }
		)
			.populate({
				path: "courseContent",
				populate: {
					path: "subSection",
				},
			})
			.exec();

		res.status(200).json({
			success: true,
			message: "Section deleted",
			data: course,
		});
	} catch (error) {
		console.error("Error deleting section:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};   