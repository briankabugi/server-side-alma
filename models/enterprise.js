const mongoose = require('mongoose')

const EnterpriseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
	category: {
        type: String,
        required: true
    },
	location: {
        type: String,
        required: true
    },
	longitude: {
        type: Number,
        required: true
    },
	latitude: {
        type: Number,
        required: true
    },
	successful_trades: {
        type: Number,
        default: 0
    },
	employees: {
        type: Number,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        required: true
    },
    images: {
        type: [String],
        default: []
    },
    placeholder: {
        type: String,
        default: ''
    },
    categories : {
        type: [],
        default: []
    }
})

const Enterprise = mongoose.model('Enterprise', EnterpriseSchema)
module.exports = Enterprise