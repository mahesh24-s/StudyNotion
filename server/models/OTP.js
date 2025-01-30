const mongoose = require('mongoose');
const mailSender=require("../utils/mailSender")
const emailTemplate = require("../mail/templates/emailVerificationTemplate");

const otpSchema= new mongoose.Schema({
    email:{
        type: String,
        required: true,
    },
    otp:{
        type: String,
        required: true,
    },
    createdAt:{
        type: Date,
        default: Date.now(),
        expires:5*60,
    }
});

async function sendVerificationEmail(email,otp){
    try{
        const mailResponse= await mailSender(email,"verification email from studyNotion",emailTemplate(otp));

        // console.log(mailResponse);
        console.log("mail sent successfully");
        // console.log("mail sent successfully",mailResponse.response);
    }
    catch(err){
        console.log("error occured while sending mail",err);
        throw err;
    }
}

otpSchema.pre("save",async function(next){
    // console.log("New document saved to database");

	// Only send an email when a new document is created
	if (this.isNew) {
		await sendVerificationEmail(this.email, this.otp);
	}
    next();
});

module.exports = mongoose.model('OTP', otpSchema);
