const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    location: {
        type: {},
        required: true
    },
    organized_by: {
        type: {},
        required: true
    },
    attending: {
        type: [],
        default: []
    }
})

const Event = mongoose.model('Event', EventSchema)
module.exports = Event