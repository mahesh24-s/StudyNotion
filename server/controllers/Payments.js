const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body
  const userId = req.user.id

  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ success: false, message: "Please Provide Course ID" })
  }

  let total_amount = 0

  for (const course_id of courses) {
    let course
    try {
      // Find the course by its ID
      course = await Course.findById(course_id)

      // If the course is not found, return an error
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Could not find the Course" })
      }

      // Check if the user is already enrolled in the course
      const isEnrolled = course.studentsEnrolled.some(
        (enrolledId) => enrolledId.toString() === userId.toString()
      )
      if (isEnrolled) {
        return res.status(400).json({ 
          success: false, 
          message: `Student is already enrolled in ${course.courseName}` 
        })
      }

      // Add the price of the course to the total amount
      total_amount += course.price
    } 
    catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  const options = {
    amount: total_amount * 100,
    currency: "INR",
    receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    notes: {
      userId: userId.toString(),
      courses: JSON.stringify(courses),
    },
  }

  try {
    // Initiate the payment using Razorpay
    const paymentResponse = await instance.orders.create(options)
    res.status(200).json({
      success: true,
      data: paymentResponse,
    })
  }
  catch (error) {
    console.error("Razorpay order initiation error:", error)
    res
      .status(500)
      .json({ success: false, message: "Could not initiate order." })
  }
}

// verify the payment
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id
  const razorpay_payment_id = req.body?.razorpay_payment_id
  const razorpay_signature = req.body?.razorpay_signature
  const courses = req.body?.courses

  const userId = req.user.id

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
    return res.status(400).json({ 
      success: false, 
      message: "Payment verification parameters missing" 
    })
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex")

  const isSignatureValid =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(razorpay_signature, "utf-8")
    )

  if (!isSignatureValid) {
    return res.status(400).json({ success: false, message: "Payment Verification Failed: Invalid Signature" })
  }

  // Prevent cart tampering: verify against courses stored in Razorpay order notes
  let coursesToEnroll = courses
  try {
    const order = await instance.orders.fetch(razorpay_order_id)
    if (order && order.notes) {
      if (order.notes.userId && order.notes.userId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Payment verification unauthorized: User mismatch",
        })
      }
      if (order.notes.courses) {
        coursesToEnroll = JSON.parse(order.notes.courses)
      }
    }
  } catch (fetchError) {
    console.warn("Could not fetch order notes from Razorpay, proceeding with request courses:", fetchError.message)
  }

  try {
    await enrollStudents(coursesToEnroll, userId)
    return res.status(200).json({ success: true, message: "Payment Verified" })
  } catch (enrollError) {
    console.error("Enrollment error during payment verification:", enrollError)
    return res.status(500).json({
      success: false,
      message: enrollError.message || "Failed to complete course enrollment",
    })
  }
}

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body

  const userId = req.user.id

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" })
  }

  try {
    const enrolledStudent = await User.findById(userId)
    if (!enrolledStudent) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    )

    return res.status(200).json({ success: true, message: "Email sent successfully" })
  } 
  
  catch (error) {
    console.error("Error in sending payment success mail:", error)
    return res
      .status(500)
      .json({ success: false, message: "Could not send email" })
  }
}

// enroll the student in the courses
const enrollStudents = async (courses, userId) => {
  if (!courses || !Array.isArray(courses) || courses.length === 0 || !userId) {
    throw new Error("Please Provide Course ID(s) and User ID")
  }

  for (const courseId of courses) {
    // Find the course and enroll the student in it ($addToSet prevents duplicates)
    const enrolledCourse = await Course.findOneAndUpdate(
      { _id: courseId },
      { $addToSet: { studentsEnrolled: userId } },
      { new: true }
    )

    if (!enrolledCourse) {
      throw new Error(`Course not found: ${courseId}`)
    }

    // Ensure course progress exists
    let courseProgress = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })

    if (!courseProgress) {
      courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      })
    }

    // Find the student and add the course and progress to their enrolled courses
    const enrolledStudent = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          courses: courseId,
          courseProgress: courseProgress._id,
        },
      },
      { new: true }
    )

    // Send an email notification to the enrolled student
    try {
      await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      )
    } catch (mailError) {
      console.error("Failed to send course enrollment email:", mailError.message)
    }
  }
}