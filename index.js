const express = require('express');
const dotenv = require('dotenv');
const cookieParser=require('cookie-parser');
const app = express();

dotenv.config({path:'./config/config.env'});

app.use(express.json());

//Cookie parser
app.use(cookieParser());

const products = require('./routes/products');
app.use('/api/products', products);

const auth = require('./routes/auth');
app.use('/api/auth', auth);

const carts = require('./routes/carts');
app.use('/api/cart', carts);

const PORT = process.env.PORT || 5000;
const server = app.listen(
    PORT,
    console.log(
        'Server running in ', 
        process.env.NODE_ENV,
        ' mode on port ',
        PORT
    )
);
process.on('unhandledRejection',(err,promise)=>{
    console.log(`Error:${err.message}`);
    server.close(()=> process.exit(1));
});