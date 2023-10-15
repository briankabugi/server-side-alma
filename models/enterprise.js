const mongoose = require('mongoose')

const EnterpriseSchema = new mongoose.Schema({
    info: {
        type: {},
        required: true
    },
	employees: {
        type: [],
        default: []
    },
    customers: {
        type: [],
        default: []
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
    },
    reviews: {
        type: [],
        default: []
    },
    statistics: {
        type : {},
        default: {}
    },
    communities: {
        type: [],
        default: []
    }
})

const Enterprise = mongoose.model('Enterprise', EnterpriseSchema)
module.exports = Enterprise