'use strict';
process.env.NODE_ENV = 'dev';
const compression = require('compression')
const express = require('express');
const app = express();

const {moment,mysql,fs,bodyParser,cookieParser,session,uuid,cheerio,images,multiparty} = require('./lib');

const util = require('./common');
const config = require('./config/config');
const mysqlConfig = require('./config/mysqlConfig');

const FAIL = config.FAIL;
const SUCCESS = config.SUCCESS;
const DEFAULT_BOY_ICON = config.DEFAULT_BOY_ICON;
const DEFAULT_GIRL_ICON = config.DEFAULT_GIRL_ICON;
const DEFAULT_USER_BACKGROUND = config.DEFAULT_USER_BACKGROUND;

const { nowTime,errHandle,mySqlHandle } = util;

const sequelize = require('./config/sequelizeConfig');
const {USER,COMMENTS,BLOG,replycomments} = require('./sequelizeModel/relationMain');
const connection = require('./config/mysqlConnection');

sequelize
    .authenticate()
    .then(()=>{
        console.log('sequelize is ready')
    })
    .catch(err=>{
        errHandle(err);
    })

app.use(bodyParser.urlencoded({ limit:'10mb',extended: true }))
app.use(bodyParser.json({limit:'10mb'}));
app.use(compression())
app.use(cookieParser());
app.use(express.static('./static'));

app.use((req,res,next)=>{ //拦截器
    let url = ['/register','/logon','/usersetting/upload-head-image','/blog/get-blog','/blog/get-blog-by-id','/usersetting/set-background'] //里面的请求不需要带token
    if( url.indexOf(req.originalUrl) === -1 ){

        if(req.body.token === "undefined" || req.body.token === "null" || !req.body.token){

            let data = {
                status:'Re',
                data:'请重新登录',
                noToken:true
            }
            res.send(data)
        }else{

            next();
        }
    }else{

        next();
    }
})

const register = require('./service/register');
const logon = require('./service/logon');
const blog = require('./service/blog');
const setting = require('./service/userSetting');
const comments = require('./service/comments');

app.post('/register',register);
app.post('/logon',logon);
app.use('/blog',blog);
app.use('/usersetting',setting);
app.use('/comments',comments);

if( process.env.NODE_ENV === 'dev' ){
    const port = process.env.port || 8086;
    app.listen(port);
}else if( process.env.NODE_ENV === 'pro' ){
    const port = 80;
    app.listen(port,'172.18.93.110',()=>{
        console.log('server start');
    });
}