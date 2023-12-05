
// Initialize Backend
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const passport = require('passport')

const app = express()
const port = process.env.PORT
const cors = require('cors')
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: "10mb" }))
app.use(passport.initialize())


const jwt = require('jsonwebtoken')

// Connect to Database
mongoose.connect(
    'mongodb+srv://corporationlighthouse:JUQfQlkkVeSAOOWF@cluster0.mojqd5l.mongodb.net/',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
).then(() => {
    console.log('Connected to Mongo')
}).catch((error) => {
    console.log('Error connecting to Mongo: ', error)
})

// Listen for port
app.listen(port, () => {
    console.log('Server running on port: ', port)
})

// Importing Models
const User = require('./models/user')
const Enterprise = require('./models/enterprise')
const Community = require('./models/community')
const Workshop = require('./models/workshop')
const Message = require('./models/message')

// Register User 

app.post('/register', (req, res) => {
    //Extract Parameters
    const info = req.body

    // Create New user Object
    const newUser = new User({ info })

    //Save to database
    newUser.save().then(() => {
        const token = jwt.sign({ userID: newUser._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
        res.status(200).json({ userID: newUser._id, token: token })
    }).catch((error) => {
        console.log('Could not create Account', error)
        res.status(500).json({ message: 'Could not create account' })
    })
})

// Login
app.post('/login', async (req, res) => {
    // Get the email and password from the request body
    const { phone, password } = req.body;

    // Validate the input
    try {
        const user = await User.findOne({ 'info.contact.phone': phone });
        if (user) {
            if (user.info.password === password) {
                const token = jwt.sign({ userID: user._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
                res.status(200).json({ id: 1, userID: user._id, token: token, info: user.info, messages: user.messages, preferences: user.preferences })
            } else {
                res.status(200).json({ id: 2, message: `Invalid Password for ${user.info.name}` })
            }
        } else {
            res.status(200).json({ id: 3, message: 'User Not Found' })
        }
    } catch (error) {
        // Handle any database errors
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Nearest Users
app.get('/nearbyUsers', async (req, res) => {
    const { x, y, limit } = req.query;

    try {
        // Find all documents
        const allUsers = await User.find()
            .select('_id info');

        // Calculate distances
        const usersWithDistances = allUsers.map(user => {
            const { latitude, longitude } = user.info.location;
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (x - latitude) * Math.PI / 180;
            const dLon = (y - longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...user.toObject(), distance };
        });

        // Sort documents by their calculated distances in ascending order
        usersWithDistances.sort((a, b) => a.distance - b.distance);

        // Return the top n documents
        const nearbyUsers = usersWithDistances.slice(0, parseInt(limit));
        res.status(200).json({nearbyUsers:nearbyUsers});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find User
app.get('/findUser/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the enterprises created by that user ID
        const user = await User.findOne({ _id: userId });

        // Send the response as JSON
        res.status(200).json({ info: user.info });
    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update User
app.put('/updateUser/:id', async (req, res) => {
    const updatedInfo = req.body; // The updated enterprise data

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            try {
                user.info = updatedInfo;

                // Save the updated User
                await user.save();

                res.status(200).json({ message: 'Saved' })
            } catch (error) {
                res.status(500).json({ error: error.message })
            }

        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

// Delete User 
app.delete('/deleteUser/:id', async (req, res) => {
    try {
        await User.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Account Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Launch EnterPrise
app.post('/createEnterprise', async (req, res) => {
    //Extract Parameters
    const newEnterprise = req.body

    // Create New user Object
    const createdEnterprise = await new Enterprise(newEnterprise)

    //Save to database
    createdEnterprise.save().then(() => {
        res.status(200).json({ message: 'Launch Successful' })
    }).catch((error) => {
        console.log('Could not create Enterprise', error)
        res.status(500).json({ message: 'Could not create enterprise' })
    })
})

// Find Enterprise
app.get('/findEnterprises/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the enterprises created by that user ID
        const enterprises = await Enterprise.find({ 'info.created_by': userId });

        // Send the response as JSON
        res.status(200).json(enterprises);
    } catch (error) {
        // Handle any errors
        res.status(500).json({ message: error.message });
    }
});

// Locate Enterprise
app.get('/locateEnterprise/:id', async (req, res) => {
    try {
        // Find the enterprise with that id
        const enterprise = await Enterprise.findById(req.params.id)
            .select('info product_categories reviews statistics communities');

        if (enterprise) {
            // Send the response as JSON
            res.status(200).json(enterprise);
        } else {
            // Send the response as JSON
            res.status(500).json({ error: 'Enterprise not found' });
        }

    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update Enterprise Info
app.put('/updateEnterpriseInfo/:id', async (req, res) => {
    const info = req.body; // The updated enterprise data

    try {
        const enterprise = await Enterprise.findById(req.params.id);

        if (!enterprise) {
            // Return 404 error
            return res.status(404).json({ error: 'Enterprise not found' });
        } else {
            // Update the enterprise with the new data
            enterprise.info = info
        }

        // Save the updated enterprise
        await enterprise.save().then(() => {
            res.json({ message: 'Saved' });
        }).catch((error) => {
            res.status(500).json({ message: error.message })
        });;

    } catch (error) {
        console.error('Error updating enterprise:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Update Enterprise Data
app.put('/updateEnterpriseData/:id', async (req, res) => {
    const { categories, images } = req.body;
    const id = req.params.id

    try {
        const enterprise = await Enterprise.findById(id);

        if (!enterprise) {
            res.status(404).json({ error: 'Enterprise not found' });
        } else {

            enterprise.product_categories = categories
            enterprise.info.images = images
            // Update other properties as needed

            // Save the updated enterprise
            await enterprise.save().then(() => {
                res.status(200).json({ message: 'Changes Saved' });
            }).catch((error) => {
                res.status(500).json({ message: 'Failed to save data' })
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

// Fetch Enterprise Data
app.get('/fetchProducts/:id', async (req, res) => {
    const id = req.params.id

    try {
        const enterprise = await Enterprise.findById(id).select('product_categories');

        if (!enterprise) {
            res.status(404).json({ error: 'Enterprise not found' });
        } else {
            const productCategories = enterprise.product_categories
            res.status(200).json({ categories: productCategories })
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

// Get Popular Enterprises
app.get('/popularEnterprises', (req, res) => {
    const { userEnterprises, x, y, limit } = req.query;

    let query = {};

    if (userEnterprises && userEnterprises.length > 0) {
        query._id = { $nin: userEnterprises };
    }

    // Query the database for the 10 most popular documents based on popularity
    Enterprise.find(query)
        .select('_id info reviews statistics communities')
        .sort({ 'statistics.popularity': -1 })
        .limit(parseInt(limit))
        .then(documents => {
            const documentsWithDistances = documents.map(doc => {
                const { latitude, longitude } = doc.info.location;
                const R = 6371; // Radius of the Earth in kilometers
                const dLat = (x - latitude) * Math.PI / 180;
                const dLon = (y - longitude) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                return { ...doc.toObject(), distance };
            });
            res.status(200).json(documentsWithDistances);
        })
        .catch(error => {
            res.status(500).json({ error: error.message });
        });
});

// Get Nearest Enterprises
app.get('/nearbyEnterprises', async (req, res) => {
    const { userEnterprises, x, y, limit } = req.query;

    let query = {};

    if (userEnterprises && userEnterprises.length > 0) {
        query._id = { $nin: userEnterprises };
    }

    try {
        // Find all documents
        const allDocs = await Enterprise.find(query)
            .select('_id info reviews statistics communities');

        // Calculate distances
        const docsWithDistances = allDocs.map(doc => {
            const { latitude, longitude } = doc.info.location;
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (x - latitude) * Math.PI / 180;
            const dLon = (y - longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...doc.toObject(), distance };
        });

        // Sort documents by their calculated distances in ascending order
        docsWithDistances.sort((a, b) => a.distance - b.distance);

        // Return the top n documents
        const nearestDocs = docsWithDistances.slice(0, limit);
        res.json(nearestDocs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Enterprise
app.delete('/deleteEnterprise/:id', async (req, res) => {
    try {
        await Enterprise.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Enterprise Deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});


// Create Community
app.post('/createCommunity', async (req, res) => {
    //Extract Parameters
    const newCommunity = req.body

    try {
        // Create New user Object
        const createdCommunity = await new Community(newCommunity)

        //Save to database
        createdCommunity.save().then(() => {
            res.status(200).json({ message: 'Community Created' })
        }).catch((error) => {
            res.status(500).json({ error: error.message })
        })
    } catch (error) {
        response.status(500).json({ message: error.message })
    }
})

// Fetch Communities
app.get('/fetchCommunities', async (req, res) => {
    const { x, y, limit } = req.query;

    try {
        // Find all documents
        const AreaDocs = await Community.find({ 'details.category': 'Area' });
        const GlobalDocs = await Community.find({ 'details.category': 'Global' });

        // Calculate distances
        const AreaDocsWithDistances = AreaDocs.map(doc => {
            let total_distance = 0;
            for (const location of doc.details.locations) {
                const { latitude, longitude } = location;
                const R = 6371;
                const dLat = (latitude - x) * Math.PI / 180; // Corrected latitude - x
                const dLon = (longitude - y) * Math.PI / 180; // Corrected longitude - y
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                total_distance += distance;
            }
            const average_distance = total_distance / doc.details.locations.length;
            return { ...doc.toObject(), average_distance };
        });

        // Sort documents by their calculated distances in ascending order
        const SortedAreaDocs = AreaDocsWithDistances.sort((a, b) => a.average_distance - b.average_distance);
        const SortedGlobalDocs = GlobalDocs.sort((a, b) => b.details.popularity - a.details.popularity);

        // Return the top n documents
        const nearestByArea = SortedAreaDocs.slice(0, limit);
        const nearestByPopularity = SortedGlobalDocs.slice(0, limit);

        // Shuffle Results
        const communities = nearestByArea.concat(nearestByPopularity);
        res.status(200).json(communities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Workshop
app.post('/createWorkshop', async (req, res) => {
    //Extract Parameters
    const newWorkshop = req.body

    try {
        // Create New user Object
        const createdWorkshop = await new Workshop(newWorkshop)

        //Save to database
        createdWorkshop.save().then(() => {
            res.status(200).json({ message: 'Workshop Created' })
        }).catch((error) => {
            res.status(500).json({ error: error.message })
        })
    } catch (error) {
        response.status(500).json({ message: error.message })
    }
})

// Fetch Workshops
app.get('/fetchWorkshops', async (req, res) => {
    const { x, y, limit } = req.query;
    try {
        // Find all documents
        const Workshops = await Workshop.find();

        // Calculate distances
        const WorkshopsWithDistances = Workshops.map(doc => {
            const { latitude, longitude } = doc.location;
            const R = 6371;
            const dLat = (latitude - x) * Math.PI / 180; // Corrected latitude - x
            const dLon = (longitude - y) * Math.PI / 180; // Corrected longitude - y
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...doc.toObject(), distance };
        });

        const SortedWorkshops = WorkshopsWithDistances.sort((a, b) => a.distance - b.distance);
        const nearbyWorkshops = SortedWorkshops.slice(0, limit)

        res.status(200).json(nearbyWorkshops)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// Search Functionality
app.get('/search', async (req, res) => {
    try {
        const { query, enterpriseLimit, productLimit, userLimit } = req.query;

        // Perform the search query for enterprises
        const enterprises = await Enterprise.find({
            $or: [
                { 'info.name': { $regex: query, $options: 'i' } },
                { 'info.category': { $regex: query, $options: 'i' } },
            ],
        }).select('_id info reviews statistics communities').limit(Number(enterpriseLimit));

        // Perform the search query for products using aggregation
        const products = await Enterprise.aggregate([
            { $unwind: '$product_categories' },
            { $unwind: '$product_categories.subCategories' },
            { $unwind: '$product_categories.subCategories.products' },
            { $match: { 'product_categories.subCategories.products.name': { $regex: query, $options: 'i' } } },
            {
                $group: {
                    _id: null,
                    products: { $push: '$product_categories.subCategories.products' },
                },
            },
            {
                $project: {
                    _id: 0,
                    products: 1,
                },
            },
        ]);

        // Perform the search query for users
        const users = await User.find({
            $or: [
                { 'info.name': { $regex: query, $options: 'i' } }
            ],
        }).select('_id info').limit(Number(userLimit));

        let productResponse = [];
        if (products.length > 0) {
            productResponse = products[0].products.slice(0, Number(productLimit));
        }

        res.status(200).json({ enterprises: enterprises, products: productResponse, users: users });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Fetch Messages
app.get('/fetchMessages', async (req, res) => {
    try {
        // Ensure userID is a string to prevent query injection attacks
        const { userID } = req.query

        const messages = await Message.find({
            $or: [{ sender: userID }, { receiver: userID }]
        })

        res.status(200).json({ messages: messages});
        
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while fetching messages.' });
    }
});








