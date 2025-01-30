const jwt=require("jsonwebtoken");
const User=require("../models/User")
require("dotenv").config();


// auth
exports.auth = async(req,res,next) => {
    try{
        //extract token
        const token=req.cookies.token || req.body.token || req.header('Authorization').replace("Bearer ","");

        if(!token){
            return res.status(401).json({
                success: false,
                message: "No token found, authorization denied"
            }); 
        }

        //verify token
        try{
            const decode=jwt.verify(token,process.env.JWT_SECRET);
            console.log("printing decode in auth",decode);
            req.user=decode;
        }
        
        catch(error){
            return res.status(401).json({
                success: false,
                message: "Token is invalid or expired, authorization denied"
            });
        }
        next();
    }

    catch(error){
        res.status(401).json({
            success: false,
            message: "something went wrong while validating the token"
        })
    }
}

//isStudent
exports.isStudent= async( req,res,next) => {
    try{
        // const userDetails=await User.findOne({email});
        if(req.user.accountType !== "Student"){
            return res.status(401).json({
                success: false,
                message: "This is a protected route for students, You are not authorized to access this resource"
            });  //forbidden access
        }

        next();
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "something went wrong while checking user type for student"
        })
    }
}


//isInstructor
exports.isInstructor= async( req,res,next) => {
    try{
        // const userDetails=await User.findOne({email});
        if(req.user.accountType !== "Instructor"){
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Instructor, You are not authorized to access this resource"
            });  //forbidden access
        }

        next();
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "something went wrong while checking user type for Instructor"
        })
    }
}


//isAdmin
exports.isAdmin= async( req,res,next) => {
    try{
        // const userDetails=await User.findOne({email});
        if(req.user.accountType !== "Admin"){
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Admin, You are not authorized to access this resource"
            });  //forbidden access
        }

        next();
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "something went wrong while checking user type for Admin"
        })
    }
}
