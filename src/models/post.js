const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    likes: [String],
    creator: String,
}, { timestamps: true });

postSchema.toJSON = function() {
    return {
        id: this._id,
        title: this.title,
        content: this.content,
        creator: this.creator,
        createdAt: this.createdAt,
    }
}

module.exports = mongoose.model('Post', postSchema);
