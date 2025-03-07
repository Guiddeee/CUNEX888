const User = require('../models/user');
const jwt=require('jsonwebtoken');
const axios = require('axios');

const sendTokenResponse=(userId,statusCode,res,data)=>{
    //Create token
    const payload = {uid:userId};
    const token = jwt.sign(payload,process.env.JWT_SECRET,{
            expiresIn: process.env.JWT_EXPIRE
        });

    const options = {
        expires:new Date(Date.now()+process.env.JWT_COOKIE_EXPIRE*24*60*60*1000),
        httpOnly:true
    };

    if(process.env.NODE_ENV==='production'){
        options.secure=true;
    }
    res.status(statusCode).cookie('token',token,options).json({
        success:true,
        token,data:data
    });

};

const register=async (req,res,next)=>{
    if(!req.body) {
        res.status(400).json({success: false, msg: 'Cannot be empty!'});
    }
    var role = req.body.role;
    if(!req.body.role){
        role = 'user';
    }
    const user = new User({
        uid: req.body.userId,
        firstNameTH: req.body.firstNameTH,
        firstNameEN: req.body.firstNameEN,
        lastNameTH: req.body.lastNameTH,
        lastNameEN: req.body.lastNameEN,
        facultyId: req.body.facultyCode,
        facultyNameTH: req.body.facultyNameTH,
        facultyNameEN: req.body.facultyNameEN,
        studentYear: req.body.studentYear,
        studentId: req.body.studentId,
        role: role
    });
    
    User.create(user, (err, data)=>{
        if(err)
            res.status(500).send({message: err.message || 'Some error occurred while register User'});
        sendTokenResponse(req.body.userId,200,res,data);
    });
};

exports.login=async (req,res,next)=>{
    try{
        const {userId}=req.body;
    
        //Validate userId
        if(!userId){
            return res.status(400).json({success:false,
                msg:'Not found userId'});
        }
        console.log('found userId',userId);
    
        //Check for user
        const user = await User.findById(userId,(err,data)=>{
            if(err) {
                if(err.kind === 'not_found') {
                    console.log('before register');
                    register(req,res);
                    return;
                } else {
                    res.status(500).send({
                        message: 'Error login with id ' + userId,
                    });
                }
            } else {
                console.log('before sendToken');
                sendTokenResponse(req.body.userId,200,res,data);
            }
        });

    }catch(err){
        console.log(err);
        return res.status(401).json({success:false, msg:'Cannot convert userId to string' })
    }
};

exports.getUsers = async (req,res,next) => {
    User.getAll((err, data) => {
        if(err)
            res.status(500).send({
                message : err.message || 'Some error occurred while retrieving All Users',
            });
        else res.status(200).json(data);
    });
};


exports.getCallback = async (req, res) => {
    const { token } = req.query;

    var userData;
    
    if (!token) {
        return res.status(400).json({ error: "Missing token" });
    }
    console.log('found token');

    try {
        // เรียก API ของ CUNEX เพื่อตรวจสอบ Token
        userData = await axios.get(`${process.env.GATEWAY}/profile`, {
            headers: {
                "Content-Type": "application/json",
                "ClientId": process.env.CLIENT_ID,       // นำ ClientId จาก .env
                "ClientSecret": process.env.CLIENT_SECRET // นำ ClientSecret จาก .env
            },
            params: { token } 
        });


    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Invalid token or API error" });
    }

    console.log(userData.data);

    const {userId}= userData.data; 

    //Check has userId
    if(!userId){
        return res.status(400).json({success:false,
            msg:'Not found userId'});
    }

    //Query user with userId
    await User.findById(userId,(err,data)=>{
        if(err) {
            if(err.kind === 'not_found') {
                //Register to database after not found
                const user = new User({
                    uid: userData.data.userId,
                    firstNameTH: userData.data.firstNameTH,
                    firstNameEN: userData.data.firstNameEN,
                    lastNameTH: userData.data.lastNameTH,
                    lastNameEN: userData.data.lastNameEN,
                    facultyId: userData.data.facultyCode,
                    facultyNameTH: userData.data.facultyNameTH,
                    facultyNameEN: userData.data.facultyNameEN,
                    studentYear: userData.data.studentYear,
                    studentId: userData.data.studentId,
                    role: 'user'
                });
                
                User.create(user, (err, data)=>{
                    if(err)
                        res.status(500).send({message: err.message || 'Some error occurred while register User'});
                    sendTokenResponse(userId,200,res,data);
                });
            } else {
                res.status(500).send({
                    message: 'Error login with id ' + userId,
                });
            }
        } else {

            //Send token after found user in database
            sendTokenResponse(userId,200,res,data);
        }
    });
};

//@desc     Get current Logged in user
//@route    POST /api/v1/auth/me
//@access   Private
exports.getMe=async(req,res,next)=>{
    User.findById(req.user.uid,(err,data)=>{
        if(err){
            res.status(400).json({
                success:false,
                message : err
            });
        }else{
            res.status(200).json({
                success:true,
                data:data
            });
        }
    });
};