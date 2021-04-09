const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000
const connectDB = require('./config/db');
connectDB();

app.use(express.json({extended: false}));
app.get('/', (_, res) => res.send('API Running!'));

//define routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/post', require('./routes/api/post'));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

