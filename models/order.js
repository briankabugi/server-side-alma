const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    enterprise_id: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    products: {
        type: Object,
        required: true
    },
    buyer: {
        type: {},
        required: true
    },
    status: {
        type: String,
        required: true
    }
})

const Order = mongoose.model('Order', OrderSchema)
module.exports = Order