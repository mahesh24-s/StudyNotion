const express=require("express");
const app= express();

const userRoutes=require("./routes/User");
const profileRoutes=require("./routes/Profile");
const paymentRoutes=require("./routes/Payments");
const courseRoutes=require("./routes/Course");
const contactUsRoute=require("./routes/Contact")

const database=require("./config/database");
const cookieParser=require("cookie-parser");
const cors=require("cors"); // to entertain our frontend requests
const {cloudinaryConnect}=require("./config/cloudinary")
const fileUpload=require("express-fileupload"); // for parsing form-data coming from the frontend (for video upload in sub-section) like multer
const dotenv=require("dotenv");

dotenv.config();
const PORT=process.env.PORT || 4000 ;
database.connect();
app.use(express.json());
app.use(cookieParser());

// app.use(cors({
//     // origin: "http://localhost:3000",
//     origin: "*",
//     credentials: true,
// }));

app.use(cors());

// intercepts the requests and uploads file to the tmp folder instead of loading it into systems RAM(which would crash the system for large video files) and then populates the req.files on the request object with an object describing the file.
// req.files = {
//   video: {
//     name: "lecture1.mp4",
//     size: 52428800,
//     mimetype: "video/mp4",
//     tempFilePath: "C:\\Users\\...\\AppData\\Local\\Temp\\tmp-1-169...",
//     truncated: false,
//     ...
//   }
// }

app.use(
    fileUpload({
       useTempFiles: true,
       tempFileDir:"/tmp",
}));

cloudinaryConnect();

app.use("/api/v1/auth",userRoutes);
app.use("/api/v1/profile",profileRoutes);
app.use("/api/v1/course",courseRoutes);
app.use("/api/v1/payment",paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);

//default route
app.get("/", (req,res) => {
    return res.json({
        success: true,
        message: "Server is running good, Welcome to the backend API of our course management system",
    })
})


app.listen(PORT,()=>{
    console.log(`App is running on port ${PORT}`);
})
