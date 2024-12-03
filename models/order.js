const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    buyer: {
        type: {},
        required: true
    }, 
    date: {
        type: Date,
        required: true
    },
    enterprises: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        default: 'pending'
    },
    agent: {
        type: String,
        required: false
    }
})

const Order = mongoose.model('Order', OrderSchema)
module.exports = Order