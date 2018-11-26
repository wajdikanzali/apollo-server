const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    message: String,
    postId: String,
    creator: String
}, { timestamps: true });

commentSchema.toJSON = function() {
    return {
        id: this._id,
        message: this.message,
        postId: this.postId,
        creator: this.creator,
        createdAt: this.createdAt,
    }
}

module.exports = mongoose.model('Comment', commentSchema);
