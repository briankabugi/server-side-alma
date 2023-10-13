const mongoose = require('mongoose')

const EnterpriseSchema = new mongoose.Schema({
    info: {
        type: [],
        required: true
    },
	employees: {
        type: [],
        required: true
    },
    product_categories : {
        type: [],
        default: []
    },
    sales: {
        type: [],
        default: []
    },
    messages: {
        type: [],
        default: []
    }
})

const Enterprise = mongoose.model('Enterprise', EnterpriseSchema)
module.exports = Enterprise