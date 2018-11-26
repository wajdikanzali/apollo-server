const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, index: true },
    password: String,
    avatar: String,
    friends: [String]
}, { timestamps: true });

userSchema.toJSON = function() {
    return {
        id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        avatar: this.avatar,
        friends: this.friends,
        createdAt: this.createdAt,
    }
}

module.exports = mongoose.model('User', userSchema);
