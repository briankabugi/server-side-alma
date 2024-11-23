const mongoose = require('mongoose')

const CommunitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    openAccess: {
        type: Boolean,
        required: True
    },
    global: {
        type: Boolean,
        required: True
    },
    radius: {
        type: String,
        required: False
    },
    location: {
        type: String,
        required: False
    },
    logo: {
        type: String,
        required: true
    },
    contact: {
        type: {},
        required: true
    },
    description: {
        type: String,
        required: true
    },
    members: {
        type: [],
        default: []
    },
    superAdmin:{
        type: String,
        required: true
    },
    admin: {
        type: String,
        required: false
    },
    images: {
        type: [],
        default: []
    },
    messages:{
        type: [],
        default: []
    },
    createdAt: {
        type:String,
        required: true
    }
})

const Community = mongoose.model('Community', CommunitySchema)
module.exports = Community