const mongoose = require('mongoose')

const WorkshopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
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
    attending: Number,
    type: String
})

const Workshop = mongoose.model('Workshop', WorkshopSchema)
module.exports = Workshop