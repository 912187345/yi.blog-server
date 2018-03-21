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

const SUCCESS = 'success';
const FAIL = 'fail';
const WRITEPATH = './static/blogImage/'
const blogImgPath = '/blogImage/';
const DEFAULT_BOY_ICON = '/userHeaderIcon/head_boy.png';
const DEFAULT_GIRL_ICON = '/userHeaderIcon/head_girl.png';
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

const mysqlConOption = {
    host     : 'localhost',
    user     : 'root',
    password : '69824686',
    // password : '',
    database : 'blog',
    dateStrings:true
}
var connection = mysql.createConnection(mysqlConOption)
connection.connect();

app.use(cookieParser());
app.use(express.static('./static'));

app.use((req,res,next)=>{ //拦截器
    let url = ['/api/register','/api/logon','/api/upload-head-image'] //里面的请求不需要带token
    if( url.indexOf(req.originalUrl) === -1 && req.originalUrl.indexOf('/api/') !== -1 ){

        if(!req.body.token){

            let data = {
                status:FAIL,
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
    let where = {};
    if( param.myBlog === true ){
        where.userToken = param.token;
    }
    BLOG.findAll({
        where:where,
        attributes:['title','blogId','date'],
        include:[{
            model:USER,
            attributes:['username','headImg'],
        },{
            model:COMMENTS
        }],
        order:[['date','DESC']]
    })
    .then((rst)=>{
        let va = rst;
        for( let i = 0; i < va.length;i++ ){
            va[i].dataValues.commentsLength = va[i].dataValues.comments.length;
            delete va[i].dataValues.comments;
        }
        let data = {
            status:SUCCESS,
            data:va
        }
        res.send(data);
    },err=>{
        let data = {
            status:FAIL,
            data:err
        }
        res.send(data)
    })
    let mysql = `select title,blogId from blog`;
})

app.post('/api/add-blog',(req, res, next)=>{
    let param = req.body;
    let userToken = param.token;
    var text = param.text;
    let title = param.title;
    let date = nowTime();
    let blogId = new Date().getTime()+userToken+'';
    let $ = cheerio.load(text);
    let img = $('img');
    let paramBlogId = param.blogId;
    // 此一系列操作必须写成一个事务 deleteImg -->  addImg -->  updateBlog
    function deleteImg(){//修改时删除旧图片
        return new Promise((res,rej)=>{
            BLOG.findOne({
                where:{
                   blogId:paramBlogId
                }
            })
            .then(rst=>{
                let text = rst.text
                let $ = cheerio.load(text);
                let img = $('img');
                
            })
        })
    }
    function base64Change(obj){ //base64转换成img
        let img = obj.img;
        return new Promise((res,rej)=>{
            if( !img.length ){ return res() }
            for( let i = 0; i < img.length; i++ ){
                let base64Data = img[i].attribs.src.replace(/^data:image\/\w+;base64,/, "");
                let dataBuffer = new Buffer(base64Data,'base64');
                let opt = {
                    fileName:WRITEPATH+blogId+i+'.jpg',
                    dataBuffer:dataBuffer
                }
                try{
                    writeFile(opt)
                    .then((rst)=>{
                        let path = opt.fileName.replace('./static','');
                        text = text.replace(img[i].attribs.src,path);
                        images(opt.fileName)
                        .save(opt.fileName,{
                            quality:60
                        })
                        if( i+1 === img.length ){
                            res(text);
                        }
                    })
                } catch(err) {
                    rej();
                    console.log(err);
                }
            }
        })
    }
    base64Change()
    .then(()=>{
        if( param.type && param.type === 'update' ){
            BLOG.update({
                content:text,
                title:title,
                updateTime:nowTime()
            },{
                where:{
                    blogId:paramBlogId
                }
            })
        }else{
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
        }
    })
    let mysql = `insert into blog (userToken,date,text,blogId,title) 
                    values( "${userToken}", "${date}", "${text}", "${blogId}", "${title}")`;
})

app.post('/api/update-blog',(req, res)=>{

})

app.post('/api/delete-blog',(req, res)=>{
    let param = req.body;
    let id = param.id;
    sequelize.transaction((t)=>{
        return BLOG.destroy({
            where:{
                id:id
            }
        }).then(()=>{
            return COMMENTS.destroy({
                where:{
                    blogId:id
                }
            })
        }).then(()=>{

            return replycomments.destroy({
                where:{
                    blogId:id
                }
            })
        })
    })
    .then(()=>{
        let data = {
            status:SUCCESS,
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
                    attributes:['headImg'],
                    as:'fromUser'
                },{
                    model:USER,
                    attributes:['headImg'],
                    as:'toUser'
                }]
            },{
                model:USER,
                attributes:['headImg'],
                as:'commentsUser'
            }]
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
        toName:param.toName,
        fromName:param.fromName,
        blogId:param.blogId
    }
    let sql = insertSql('replyComments',obj);
    mySqlHandle(sql)
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
// app.use((req,res,next)=>{
//     res.header("Content-Type","text/html");
//     res.status(200);
//     res.send(indexFile.toString());
//     res.end();
// })
// blog E
const port = process.env.port || 8085;
app.listen(port);

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

var errHandle = (err)=>{
    throw err;
}

function nowTime(){
    var time = new Date();
    return `${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()} ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
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
function writeFile(opt){
    return new Promise((res,rej)=>{
        fs.writeFile(opt.fileName,opt.dataBuffer,(err,file)=>{
            if(err){
                throw err;
            }else{
                res(file);
            }
        })
    })
}
// common function E
