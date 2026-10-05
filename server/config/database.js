const mongoose = require('mongoose');

require("dotenv").config();

exports.connect = () => {
    mongoose.connect(process.env.MONGODB_URL)
       .then(() => console.log('Database Connected successfully...'))
       .catch((err) => {
            console.error('Database connection error:', err)
            process.exit(1);
       });
}