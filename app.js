'use strict';
const express = require('express');
const app = express();

const moment = require('moment');
const mysql = require('mysql');
const fs = require('fs');
const bodyParser = require('body-parser'); 
const cookieParser = require('cookie-parser');
const session = require('express-session');
const uuid = require('node-uuid');
const cheerio = require('cheerio');
const images = require('images');
const multiparty = require('multiparty');

const util = require('./common');
const config = require('./config');
const FAIL = config.FAIL;
const SUCCESS = config.SUCCESS;
const DEFAULT_BOY_ICON = config.DEFAULT_BOY_ICON;
const DEFAULT_GIRL_ICON = config.DEFAULT_GIRL_ICON;
const DEFAULT_USER_BACKGROUND = config.DEFAULT_USER_BACKGROUND;
const nowTime = util.nowTime;
const errHandle = util.errHandle;

const sequelize = require('./sequelizeConfig');
const USER = require('./sequelizeModel/USER');
const COMMENTS = require('./sequelizeModel/COMMENTS');
const BLOG = require('./sequelizeModel/BLOG');
const replycomments = require('./sequelizeModel/replycomments');
const relationMain = require('./sequelizeModel/relationMain')();

sequelize
    .authenticate()
    .then(()=>{
        console.log('sequelize is ready')
    })
    .catch(err=>{
        console.error('error',err);
    })

app.use(bodyParser.urlencoded({ limit:'50mb',extended: true }))
app.use(bodyParser.json({limit:'50mb'}));

var sqlName,sqlPwd,host;
if(process.env.NODE_ENV === 'dev'){
    sqlName = 'root';
    sqlPwd = '69824686';
    host = 'localhost';
}else if(process.env.NODE_ENV === 'pro'){
    sqlName = 'root';
    sqlPwd = '69824686gg';
    host = '120.79.208.33';
}
const mysqlConOption = {
    host     : host,
    user     : sqlName,
    password : sqlPwd,
    database : 'blog',
    dateStrings:true
}
var connection = mysql.createConnection(mysqlConOption)
connection.connect();

app.use(cookieParser());
app.use(express.static('./static'));

app.use((req,res,next)=>{ //拦截器
    let url = ['/api/register','/api/logon','/api/upload-head-image','/api/get-blog','/api/get-blog-by-id','/api/set-background'] //里面的请求不需要带token
    if( url.indexOf(req.originalUrl) === -1 && req.originalUrl.indexOf('/api/') !== -1 ){

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

// setting
app.post('/api/upload-head-image',(req,res)=>{
    let form = new multiparty.Form({uploadDir:'./static/userHeaderIcon'})
    form.parse(req,(err, fields, files)=>{
        let inputFile = files.file[0];
        let filePath = files.file[0].path;
        let token = fields.token[0];
        let newHeadName = '/userHeaderIcon/'+fields.token[0]+new Date().getTime()+'.jpg';
        let renamePath = __dirname+'/static' + newHeadName;

        sequelize.transaction((t)=>{
            return USER.findOne({
                where:{
                    token:token
                }
            })
            .then((rst)=>{
                return new Promise((res,rej)=>{
                    if(rst.headImg && rst.headImg !== DEFAULT_BOY_ICON && rst.headImg !== DEFAULT_GIRL_ICON){
                        fs.unlink(__dirname+'/static'+rst.headImg,(err)=>{
                            if(err) {
    
                                errHandle(err);
                                rej()
                            } else {
    
                                res();
                            }
                        })        
                    }else{
                        res();
                    }
                })
            })
            .then(()=>{
                return new Promise((suc,rej)=>{
                    fs.rename(filePath,renamePath,(err)=>{
                        if(!err){
                            USER.update({
                                headImg:newHeadName
                            },{
                                where:{
                                    token:token
                                }
                            })
                            .then(()=>{
                                images(renamePath)
                                .save(renamePath,{
                                    quality:60
                                })
                                suc();
                            },err=>{
                                rej();
                            })
                            .catch(err=>{
                                errHandle(err);
                                rej();
                            })
                        }else{
                            errHandle(err);
                            rej();
                        }
                    })
                })
            })
        })
        .then((rst)=>{
            let data = {
                status:SUCCESS,
                data:{
                    headImg:newHeadName
                }
            }
            res.send(data);
        })
        .catch(()=>{
            let data = {
                status:FAIL,
                data:''
            }
            res.send(data);
            errHandle(err);
        })
    })
})

app.post('/api/edit-user',(req, res)=>{
    let param = req.body;
    let updateParam;
    switch(param.type){
        case 'username':
            updateParam = {
                username:param.value
            }
            break;
        case 'email':
            updateParam = {
                email:param.value
            }
            break;
    }
    USER.update(updateParam,{where:{token:param.token}})
    .then((rst)=>{
        let data = {
            status:SUCCESS
        }
        res.send(data);
    },err=>{
        errHandle(err);
    })
    .catch((err)=>{
        errHandle(err)
    })
})

app.post('/api/set-background',(req, res)=>{
    let form = new multiparty.Form({uploadDir:__dirname+'/static/bg'});
    form.parse(req,(err, fields, files)=>{
        let inputFile = files.file[0];
        let filePath = files.file[0].path;
        let token = fields.token[0];
        let newBackground = '/bg/'+fields.token[0]+new Date().getTime()+'.jpg';
        let renamePath = __dirname+'/static' + newBackground;

        sequelize.transaction(()=>{
            return USER.findOne({
                where:{token:token}
            })
            .then((rst)=>{
                return new Promise((res,rej)=>{
                    if(rst.background && rst.background !== DEFAULT_USER_BACKGROUND){
                        fs.unlink(__dirname+'/static'+rst.background,(err)=>{
                            res();
                        })        
                    }else{
                        res();
                    }
                })
            })
            .then(()=>{
                return new Promise((suc,rej)=>{
                    fs.rename(filePath,renamePath,(err)=>{
                        if(!err){
                            USER.update({
                                background:newBackground
                            },{
                                where:{
                                    token:token
                                }
                            })
                            .then(()=>{
                                images(renamePath)
                                .save(renamePath,{
                                    quality:50
                                })
                                suc();
                            },err=>{
                                rej();
                            })
                            .catch(err=>{
                                errHandle(err);
                                rej();
                            })
                        }else{
                            errHandle(err);
                            rej();
                        }
                    })
                })
            })
        })
        .then((rst)=>{
            let data = {
                status:SUCCESS,
                data:{
                    background:newBackground
                }
            }
            res.send(data);
        })
        .catch(()=>{
            let data = {
                status:FAIL,
                data:''
            }
            res.send(data);
            errHandle(err);
        })
    })
})
// setting

// 登录 S
app.post('/api/register',(req, res)=>{
    let param = req.body;
    let username = param.userName;
    let pwd = param.pwd;
    let email = param.email;
    let sex = param.sex;
    let token = uuid.v4().replace(/-/g,'');
    let defaultHeadImg = sex === 'boy' ? DEFAULT_BOY_ICON : DEFAULT_GIRL_ICON;
    USER.findOrCreate({
        where:{
            username:username
        },
        defaults:{
            password:pwd,
            sex:sex,
            email:email,
            token:token,
            headImg:defaultHeadImg
        }
    })
    .spread((user,create)=>{
        if(create){

            let data = {
                    status:SUCCESS,
                    data:{
                        username:username,
                        email:email,
                        sex:sex,
                        token:token,
                        headImg:defaultHeadImg
                    }
                }
            res.send(data);
        }else{

            let data = {
                    status:FAIL,
                    errMsg:'用户名已存在，请使用其他用户名'
                }
            res.send(data);
        }
    })
    .catch((err)=>{

        let data = {
            status:FAIL,
            errMsg:'注册失败，请稍后重试'
        }
        res.send(data);
    })
    let sql = `insert into user (username, password, sex, email, token) 
    values("${username}", "${pwd}", "${sex}", "${email}", "${token}")`;
})

app.post('/api/logon',(req,res)=>{
    let param = req.body;
    let username = param.user;
    let password = param.pwd;
    let data = {};
    USER.findOne({
        where:{
            username:username
        },
        attributes:{exclude: ['userid']}
    })
    .then((rst)=>{
        if(rst){
            if(rst.password === password){

                data.status = SUCCESS;
                data.data = rst;
                delete data.data.dataValues.password;
                res.send(data);
            }else{

                data.status = FAIL;
                data.errMsg = '密码错误';
                res.send(data);
            }
        }else{

            data.status = FAIL;
            data.errMsg = '请输入正确的用户账号';
            res.send(data);
        }
    })
})
// 登录 E

// blog S 后期需要拆分开
app.post('/api/get-blog',(req, res)=>{
    let param = req.body;
    let limit = param.limit || 10;
    let offset = param.offset || 0;
    //  sequelize findAll如果有联合查询，再加上limit的时候有bug，github上也有人提了相信下个版本会修复，先用原生语句查询
    // BLOG.findAll({
    //     where:where,
    //     attributes:['title','blogId','date'],
    //     include:[{
    //         model:USER,
    //         attributes:['username','headImg'],
    //     },{
    //         model:COMMENTS
    //     }],
    //     order:[['date','DESC']]
    // })
    if(param.myBlog === true){
        var get_blog_sql = `select * from get_list WHERE userToken = "${param.token}" LIMIT ${offset},${limit}`;
    }else{

        var get_blog_sql = `select * from get_list LIMIT ${offset},${limit}`;
    }
    mySqlHandle(get_blog_sql)
    .then((rst)=>{
        for( let i = 0, len = rst.length; i< len ;i++ ){
            rst[i].date = util.momentDate(rst[i].date);
        }
        let data = {
            status:SUCCESS,
            data:rst
        }
        res.send(data);
    },err=>{
        let data = {
            status:FAIL,
            data:err
        }
        res.send(data)
    })
    //let mysql = `select title,blogId from blog`;
})

app.post('/api/add-blog',(req, res, next)=>{
    let param = req.body;
    let userToken = param.token;
    var text = param.text;
    let title = param.title;
    let date = nowTime();
    let blogId = new Date().getTime()+userToken+'';
    
    util.base64Change({text:text,fileName:blogId})
    .then((text)=>{
        BLOG.create({
            userToken:userToken,
            content:text,
            title:title,
            date:date,
            blogId:blogId,
            updateTime:date
        })
        .then(()=>{
            let data = {
                status:SUCCESS,
                data:{
                    blogId:blogId
                }
            }
            res.send(data);
        })
        .catch((err)=>{
            let data = {
                status:FAIL,
                data:err
            }
            res.send(data);
        })
    },err=>{
        let data = {
            status:FAIL
        }
        res.send(data);
    })
    .catch(err=>{
        let data = {
            status:FAIL
        }
        res.send(data);
    })
    let mysql = `insert into blog (userToken,date,text,blogId,title) 
                    values( "${userToken}", "${date}", "${text}", "${blogId}", "${title}")`;
})

app.post('/api/edit-blog',(req, res)=>{
    let param = req.body;
    let blogId = param.blogId;
    let userToken = param.token;
    let text = param.text;
    let title = param.title;
    sequelize.transaction((t)=>{
        return BLOG.findOne({
                where:{
                    blogId:blogId
                }
            })
            .then((rst)=>{
                return util.deleteImg({text:rst.content,editText:text})
            })
            .then(()=>{
                return util.base64Change({text:text,fileName:blogId})
            })
            .then((text)=>{
                return BLOG.update({
                        content:text,
                        title:title,
                        updateTime:nowTime()
                    },{
                        where:{
                            blogId:blogId
                        }
                    })
            })
    })
    .then((rst)=>{
        let data = {
            status:SUCCESS,
            data:rst[0]
        }
        res.send(data);
    })
    .catch((err)=>{
        let data = {
            status:FAIL,
            data:err
        }
        res.send(data);
    })
    
})

app.post('/api/delete-blog',(req, res)=>{
    let param = req.body;
    let blogId = param.blogId;
    sequelize.transaction((t)=>{
        return BLOG.findOne({
                where:{
                    blogId:blogId
                }
            })
            .then((rst)=>{
                return util.deleteImg({text:rst.content})
            })
            .then(()=>{
                return BLOG.destroy({
                        where:{
                            blogId:blogId
                        }
                    })
            })
            .then(()=>{
                return COMMENTS.destroy({
                    where:{
                        blogId:blogId
                    }
                })
            }).then(()=>{
                return replycomments.destroy({
                    where:{
                        blogId:blogId
                    }
                })
            })
    })
    .then(()=>{
        let data = {
            status:SUCCESS
        }
        res.send(data);
    })
    .catch(err=>{
        let data = {
            status:FAIL,
            data:err
        }
        res.send(data);
    })
})

app.post('/api/get-blog-by-id',(req, res)=>{
    let token = req.body.token;
    let id = req.body.id;
    BLOG.findOne({
        where:{blogId:id},
        include:[{
            model:COMMENTS,
            as:'comments',
            include:[
            {
                model:replycomments,
                as:'replycomments',
                attributes: { exclude: ['id'] },
                include:[
                {
                    model:USER,
                    attributes:['headImg','username'],
                    as:'fromUser'
                },{
                    model:USER,
                    attributes:['headImg','username'],
                    as:'toUser'
                }]
            },{
                model:USER,
                attributes:['headImg','username'],
                as:'commentsUser'
            }]
        },{
            model:USER,
            attributes:['headImg','username'],
        }],
        order:[[COMMENTS,replycomments,'replyDate','ASC']]
    })
    .then(rst=>{
        let data = {
            status:SUCCESS,
            data:rst
        }
        res.send(data)
    })
    //let sql = `SELECT * FROM blog as b LEFT JOIN comments as c ON (b.blogId = c.blogId) WHERE b.blogId = "${id}"`; 多表查询一般不用 select *
    let sql = `SELECT b.*,c.commentsToken,c.id as commentId,c.commentsContent,c.date as commentsDate,c.commentsName,r.*
                FROM blog as b 
                LEFT JOIN comments as c 
                ON (b.blogId = c.blogId) 
                left join replyComments as r
                on ( c.id = r.commentsId )
                WHERE b.blogId = "${id}" `
})

app.post('/api/blog-comments',(req, res)=>{
    let param = req.body;
    let obj = {
        blogId:param.blogId,
        commentsContent:param.text,
        date:nowTime(),
        commentsToken:param.token,
        id:'' + param.blogId + new Date().getTime(),
        commentsName:param.commentsName
    }
    COMMENTS.create(obj)
    .then(rst=>{
        let data = {
            status:SUCCESS,
            data:obj
        }
        res.send(data);
    },err=>{
        let data = {
            status:FAIL,
            data:err
        }
        res.send(data);
    })
    let sql = insertSql('comments',obj);
})

app.post('/api/delete-comments',(req, res)=>{
    let param = req.body;
    let commentsId = param.commentsId;
    sequelize.transaction((t)=>{
        return COMMENTS.destroy({
            where:{
                id:commentsId
            }
        }).then(()=>{
            return replycomments.destroy({
                where:{
                    commentsId:commentsId
                }
            })
        })
    })
    .then(()=>{
        let data = {
            status:SUCCESS
        }
        res.send(data);
    })
    .catch((err)=>{
        let data = {
            status:FAIL,
            data:err
        }
        res.send(data);
    })
    let sql = `DELETE FROM comments WHERE id = "${commentsId}"`;
})


app.post('/api/reply-comments',(req, res)=>{
    let param = req.body;
    let obj = {
        toToken:param.toToken,
        fromToken:param.fromToken,
        replyText:param.text,
        commentsId:param.commentsId,
        replyDate:nowTime(),
        blogId:param.blogId
    }
    replycomments.create(obj)
    .then(rst=>{
        let data = {
            status:SUCCESS,
            data:rst
        }
        res.send(data);
    },err=>{
        errHandle(err);
    })
})
var indexFile;
fs.readFile(__dirname+'/static/index.html',(err,data)=>{
    indexFile = data;
})

// blog E
if( process.env.NODE_ENV === 'dev' ){
    const port = process.env.port || 8086;
    app.listen(port);
}else if( process.env.NODE_ENV === 'pro' ){
    const port = 80;
    app.listen(port,'172.18.93.110',()=>{
        console.log('server start');
    });
}


// common function S
const mySqlHandle = (sql)=>{
    return new Promise((res, rej)=>{
        connection.query(sql,(err, rst, fields)=>{

            if( err ) errHandle(err)

            if( rst ){

                res(rst)
            }else if( fields ){

                rej(fields);
            }
        })
    })
}

function insertSql(tabel,obj){
    let sqlS = `insert into ${tabel} (`;
    let param = '';

    let sqlE = ' values (';
    let data = ''
    for( let i in obj ){
        param += `${i}` + ',';
        data += `'${ obj[i] }',`
    }

    param = param.substring(0,+param.length-1)+ ')';
    data = data.substring(0,+data.length-1)+ ')';
    return sqlS + param  + sqlE + data;
}

function getTime(date){ //对数据库的时间进行处理
    return date.slice(0,+date.length - 6);
}

// common function E
