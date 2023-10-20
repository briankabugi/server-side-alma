const mongoose = require('mongoose')

const communitySchema = new mongoose.Schema({
    name: {
        type: string,
        required: true
    },
    logo: {
        type: string,
        required: true
    },
    description: {
        type: string,
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
        type: string,
        required: true
    }
})

const Community = mongoose.model('Community', communitySchema)
module.exports = Community