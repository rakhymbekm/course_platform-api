const express = require('express');
const app = express();
const cors = require('cors');

// middleware
app.use(express.json()); // req.body
app.use(cors());
app.options('*', cors());
app.use('/uploads', express.static('uploads')); // to make images available

// routes
app.use('/', require('./routes/public'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/manage'));
app.use('/student', require('./routes/dashboard'));

app.listen(5000, ()=>{
    console.info('Server is running on the port 5000...')
});