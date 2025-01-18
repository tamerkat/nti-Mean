const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Booking = require('./models/Booking');
const Contact = require('./models/Contact');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User.js'); 
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const Article = require('../backend/models/Article.js')

const app = express();
app.use(express.json()); 

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/restaurantDB')
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Server listening
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('/api/categories', (req, res) => {
    // Fetch or return categories here
    res.json([
        { id: 1, name: 'Breakfast' },
        { id: 2, name: 'Main Dishes' }, 
        { id: 3, name: 'Desserts' },
        { id: 4, name: 'Drinks' }
    ]);
});

// Set up storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Uploads folder where images are stored
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });

  // Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit size to 1MB
    fileFilter: function (req, file, cb) {
      // Check file type
      const filetypes = /jpeg|jpg|png|gif/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
  
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb('Error: Images Only!');
      }
    }
  }).single('image'); // 'image' should match the form field name
  

// Booking route
app.post('/api/booking', (req, res) => {
    const newBooking = new Booking(req.body);
    newBooking.save()
      .then(booking => res.status(201).json(booking))
      .catch(err => res.status(400).json({ error: err.message }));
});

// Contact route
app.post('/api/contact', async (req, res) => {
    try {
        const newContact = new Contact(req.body);
        await newContact.save();
        res.status(201).json(newContact);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Contacts for admin only
app.get('/api/contact', async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.status(200).json(contacts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete contact by ID
app.delete('/api/contact/:id', async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.status(200).json({ message: 'Contact deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// update contact by ID
app.put('/api/contact/:id', async (req, res) => {
    try {
        const { name, email, message, subject, date } = req.body;
        const updatedContact = {
            name,
            email,
            date,
            subject,
            message
        };
        const contact = await Contact
            .findByIdAndUpdate(req.params.id, updatedContact, { new: true });
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.status(200).json(contact);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
);

// Get all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const menuItems = await MenuItem.find();
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new menu item (admin only)
// Add new menu item (with file upload)
app.post('/api/menu', (req, res) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }
        // Ensure `req.file` exists before trying to access it
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
          }

      // Create a new menu item with the file path
      const { name, description, price, category } = req.body;
      const newItem = new MenuItem({
        name,
        description,
        price,
        category,
        image: req.file.filename // Save only the filename in the database
      });
  
      newItem.save()
        .then(item => res.status(201).json(item))
        .catch(err => res.status(500).json({ message: err.message }));
    });
  });

  // Serve static files (uploads)
// app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Update menu item (admin only)
app.put('/api/menu/:id', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        try {
            const { name, description, price, category } = req.body;
            const updatedItem = {
                name,
                description,
                price,
                category,
            };

            // If a new image is uploaded, update the image field
            if (req.file) {
                updatedItem.image = req.file.filename; // Save new image filename
            }

            const item = await MenuItem.findByIdAndUpdate(req.params.id, updatedItem, { new: true });
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.status(200).json(item);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
});

// Delete menu item (admin only)
app.delete('/api/menu/:id', async (req, res) => {
    console.log(`Attempting to delete item with ID: ${req.params.id}`);
    try {
        const result = await MenuItem.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: error.message });
    }
});

// Register route
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); 
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Token generation is removed
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get all users 
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user by ID
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user
            = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
);
// Logout
app.post('/api/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Get all bookings
app.get('/api/booking', async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// update booking by ID (admin only)
app.put('/api/booking/:id', async (req, res) => {
    try {
        const { date, time, name, phone, person} = req.body;
        const updatedBooking = {
            date,
            time,
            name,
            phone,
            person
        };
        const booking = await Booking
            .findByIdAndUpdate(req.params.id, updatedBooking, { new: true });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.status(200).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
);

// Delete booking by ID
app.delete('/api/booking/:id', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.status(200).json({ message: 'Booking deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Add new article (with optional image upload)
app.post('/api/articles', (req, res) => {
    console.log('Request body:', req.body); // Log request body
    console.log('Uploaded file:', req.file); // Log uploaded file
        upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        const { title, altText, content, date, category } = req.body;

        const newArticle = new Article({
            title,
            imgSrc: req.file ? req.file.filename : null, // Save filename if uploaded
            altText,
            content,
            date,
            category
        });

        try {
            const savedArticle = await newArticle.save();
            res.status(201).json(savedArticle);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });
});

// Get all articles
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find();
        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get article by ID
app.get('/api/articles/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json(article);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update article (with optional image upload)
app.put('/api/articles/:id', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        const { title, altText, content, date, category } = req.body;
        const updatedData = {
            title,
            altText,
            content,
            date,
            category,
        };

        // Update imgSrc only if a new image is uploaded
        if (req.file) {
            updatedData.imgSrc = req.file.filename;
        }

        try {
            const updatedArticle = await Article.findByIdAndUpdate(req.params.id, updatedData, { new: true });
            if (!updatedArticle) {
                return res.status(404).json({ message: 'Article not found' });
            }
            res.status(200).json(updatedArticle);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });
});

// Delete article by ID
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const result = await Article.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json({ message: 'Article deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});