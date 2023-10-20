const mongoose = require('mongoose')

const CommunitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    logo: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    details: {
        type: {},
        required: true
    },
    members: {
        type: [],
        default: []
    },
    managed_by: {
        type: String,
        required: true
    }
})

const Community = mongoose.model('Community', CommunitySchema)
module.exports = Community