const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = async function dbConnect() {
    mongoose.connection
        .on('error', (error) => { console.log(`MongoDB Connection error ${error}`); })
        .on('close', () => { console.log('Mongodb closed!'); })
        .once('open', () => { console.log('Mongodb connected!'); });

   await mongoose.connect("mongodb://localhost/goMyCodeDB");
}
