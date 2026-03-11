const nodemailer=require('nodemailer');
require("dotenv").config();

const mailSender= async(email,title,body) =>{
    try{
        // console.log("DOC",  doc);

        //transporter //shift this configuraion under config folder
        const transporter=nodemailer.createTransport({
            host:process.env.MAIL_HOST,
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        // send mail
        let info = await transporter.sendMail({
            from:"studyNotion Project",
            to:`${email}`,
            subject:`${title}`,
            html:`${body}`,
        })

        // console.log(info);
        return info;
    }

    catch(error){
        console.error(error.message);
        
    }
}

module.exports=mailSender;