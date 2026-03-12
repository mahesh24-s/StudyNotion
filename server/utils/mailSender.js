const nodemailer=require('nodemailer');
require("dotenv").config();

const mailSender= async(email,title,body) =>{
    try{
        // console.log("DOC",  doc);

        //transporter //shift this configuraion under config folder
        const transporter=nodemailer.createTransport({
            // host:process.env.MAIL_HOST,
            service: 'gmail',
            host: 'https://www.google.com/search?q=smtp.gmail.com',
            port: 465,
            secure: true, // SSL

            // connectionTimeout: 10000,
            // greetingTimeout: 10000,
            // socketTimeout: 10000,
            // // debug: true, // Enable debugging
            // logger: true, // Log information to console

            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        const options = {
            from:"studyNotion",
            to:`${email}`,
            subject:`${title}`,
            html:`${body}`,
        };

        // send mail
        let info = await transporter.sendMail(options, (error, info) => {
            if (error) {
                console.error('Email error:', error)
            } else {
                console.log('Email sent:', info.response)
            }
        })

        // console.log("info after sending mail: ", info);
        return info;
    }

    catch(error){
        console.error(error.message);
        
    }
}

module.exports=mailSender;