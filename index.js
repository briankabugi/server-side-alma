
// Initialize Backend
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const { Binary } = require("mongodb")
const passport = require('passport')
const bcrypt = require('bcrypt');
const http = require('http')
const ws = require('ws')

const app = express()
const port = process.env.PORT || 3000
const cors = require('cors')
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: "10mb" }))
app.use(passport.initialize())

const jwt = require('jsonwebtoken')

// Connect to Database
mongoose.connect(
    process.env.DATABASE_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
).then(() => {
    console.log('Connected to Mongo')
}).catch((error) => {
    console.log('Error connecting to Mongo: ', error)
})

// Importing Models
const User = require('./models/user')
const Company = require('./models/company')
const Community = require('./models/community')
const Workshop = require('./models/event')
const Message = require('./models/message')

// Set Up Servers
const app_server = http.createServer(app)

app_server.listen(port => {
    console.log('Server Listening on port ', port)
})

// Register User
app.post('/register', async (req, res) => {
    //Extract Parameters
    const userData = req.body
    const code = userData.code

    // Hash the password
    const hashedCode = await bcrypt.hash(code, 10);

    // Create New user Object
    const newUser = new User({ info: userData.info, code: hashedCode })

    //Save to database
    newUser.save().then(() => {
        const token = jwt.sign({ userID: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        res.status(200).json({ userID: newUser._id, token: token })
    }).catch((error) => {
        console.log('Could not create Account', error)
        res.status(500).json({ message: 'Could not create account' })
    })
})

// Login
app.post('/login', async (req, res) => {
    // Get the email and password from the request body
    const { phone, code } = req.body;

    // Validate the input
    try {
        const user = await User.findOne({ 'info.contact.phone': phone });
        if (user) {
            bcrypt.compare(code, user.code).then(verified => {
                if (verified) {
                    const token = jwt.sign({ userID: user._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
                    res.status(200).json({ userID: user._id, token: token, info: user.info, preferences: user.preferences, friends: user.friends, events: user.events })
                } else {
                    res.status(500).json({ message: 'Check password and try again' })
                }
            });
        } else {
            res.status(500).json({ message: 'User Not Found' })
        }
    } catch (error) {
        // Handle any database errors
        res.status(500).json({ message: 'Internal Server error' });
    }
});

// Fetch All Users
app.get('/fetchUsers', async (req, res) => {
    try {
        const users = await User.find({})
        res.status(200).json({ users: users })
    } catch (error) {
        res.status(500).message('Internal Server Error')
    }
})

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
        res.status(200).json({ nearbyUsers: nearbyUsers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Find User
app.get('/findUser/:id', async (req, res) => {
    try {
        // Get the user ID from the params
        const id = req.params.id;

        // Find the User
        const user = await User.findOne({ _id: id });

        // Send the response as JSON
        if (user) {
            // Send the response as JSON
            res.status(200).json({info: user.info});
        } else {
            // Send the response as JSON
            res.status(500).json({ message: 'User not found' });
        }

    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update User Info
app.put('/updateUserInfo/:id', async (req, res) => {
    const updatedInfo = req.body; // The updated Company data

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

// Update User
app.put('/updateUserPreferences/:id', async (req, res) => {
    const updatedPreferences = req.body; // The updated Company data

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            try {
                user.preferences = updatedPreferences;

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


// Updating Friends List
app.put('/updateFriends', async (req, res) => {
    const id1 = req.body.id1;
    const id2 = req.body.id2;

    try {
        // Fetch the users
        const user1 = await User.findById(id1);
        const user2 = await User.findById(id2);

        if (!user1 || !user2) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Update friends field
        user1.friends.push(id2);
        user2.friends.push(id1);

        // Save the updated users
        await user1.save();
        await user2.save();

        res.send({ message: 'Friends updated successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Server error' });
    }
});

// Delete User 
app.delete('/deleteUser/:id', async (req, res) => {
    try {
        await User.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Account Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Launch Company
app.post('/createCompany', async (req, res) => {
    try {
        // Extract Parameters
        const newCompany = req.body;

        newCompany.code = await bcrypt.hash(newCompany.code, 5);
        newCompany.info.logo = new Binary(Buffer.from(newCompany.info.logo, 'base64'));

        // Create New Company Object
        const createdCompany = new Company(newCompany);

        // Save to database
        await createdCompany.save();

        res.status(200).json({ message: 'Launch Successful' });
    } catch (error) {
        console.log('Could not create Company', error);
        res.status(500).json({ message: error.message });
    }
});

// Find Company
app.get('/findCompanies/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the Companies created by that user ID
        const Companies = await Company.find({ 'info.created_by': userId })
            .select('_id info friends product_categories reviews statistics communities events');

        // Send the response as JSON
        res.status(200).json(Companies);
    } catch (error) {
        // Handle any errors
        res.status(500).json({ message: error.message });
    }
});

// Locate Company
app.get('/locateCompany/:id', async (req, res) => {
    try {
        // Find the Company with that id
        const Company = await Company.findById(req.params.id)
            .select('info');

        if (Company) {
            // Send the response as JSON
            res.status(200).json({info: Company});
        } else {
            // Send the response as JSON
            res.status(500).json({ message: 'Company not found' });
        }

    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update Company Info
app.put('/updateCompanyInfo/:id', async (req, res) => {
    const info = req.body; // The updated Company data

    try {
        const Company = await Company.findById(req.params.id);

        if (!Company) {
            // Return 404 error
            return res.status(404).json({ error: 'Company not found' });
        } else {
            // Update the Company with the new data
            Company.info = info
        }

        // Save the updated Company
        await Company.save().then(() => {
            res.json({ message: 'Saved' });
        }).catch((error) => {
            res.status(500).json({ message: error.message })
        });;

    } catch (error) {
        console.error('Error updating Company:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Update Company Data
app.put('/updateCompanyData/:id', async (req, res) => {
    const { categories, images } = req.body;
    const id = req.params.id

    try {
        const Company = await Company.findById(id);

        if (!Company) {
            res.status(404).json({ error: 'Company not found' });
        } else {

            Company.product_categories = categories
            Company.info.images = images
            // Update other properties as needed

            // Save the updated Company
            await Company.save().then(() => {
                res.status(200).json({ message: 'Changes Saved' });
            }).catch((error) => {
                res.status(500).json({ message: 'Failed to save data' })
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

// Fetch Company Data
app.get('/fetchProducts/:id', async (req, res) => {
    const id = req.params.id

    try {
        const Company = await Company.findById(id).select('product_categories');

        if (!Company) {
            res.status(404).json({ error: 'Company not found' });
        } else {
            const productCategories = Company.product_categories
            res.status(200).json({ categories: productCategories })
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

// Get Popular Companies
app.get('/popularCompanies', (req, res) => {
    const { userCompanies, x, y, limit } = req.query;

    let query = {};

    if (userCompanies && userCompanies.length > 0) {
        query._id = { $nin: userCompanies };
    }

    // Query the database for the 10 most popular documents based on popularity
    Company.find(query)
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

// Get Nearest Companies
app.get('/nearbyCompanies', async (req, res) => {
    const { userCompanies, x, y, limit } = req.query;

    let query = {};

    if (userCompanies && userCompanies.length > 0) {
        query._id = { $nin: userCompanies };
    }

    try {
        // Find all documents
        const allDocs = await Company.find(query)
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

// Delete Company
app.delete('/deleteCompany/:id', async (req, res) => {
    try {
        await Company.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Company Deleted' })
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
        const { query, CompanyLimit, productLimit, userLimit } = req.query;

        // Perform the search query for Companies
        const Companies = await Company.find({
            $or: [
                { 'info.name': { $regex: query, $options: 'i' } },
                { 'info.category': { $regex: query, $options: 'i' } },
            ],
        }).select('_id info reviews statistics communities').limit(Number(CompanyLimit));

        // Perform the search query for products using aggregation
        const products = await Company.aggregate([
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

        res.status(200).json({ Companies: Companies, products: productResponse, users: users });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Fetch User Messages
app.get('/fetchMessages', async (req, res) => {
    try {
        const { id } = req.query;

        // Fetch all messages sent or received by the user
        const messages = await Message.find({
            $or: [{ sender: id }, { receiver: id }]
        });

        res.status(200).json({ messages: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Message
app.post('/addMessage', async (req, res) => {
    const { sender, receiver, content, createdAt } = req.body;

    const newMessage = new Message({
        type,
        sender,
        receiver,
        content,
        createdAt
    });

    try {
        await newMessage.save();
        res.json({ message: 'Message Sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


