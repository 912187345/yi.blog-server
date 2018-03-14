'use strict';
const express = require('express');
const app = express();

const moment = require('moment');

const mysql = require('mysql');

const bodyParser = require('body-parser'); 
const cookieParser = require('cookie-parser');
const session = require('express-session');
var RedisStore = require('connect-redis')(session);
const uuid = require('node-uuid');

const SUCCESS = 'success';
const FAIL = 'fail';

const Sequelize = require('sequelize'); 
const cls = require('continuation-local-storage');
const clsNameSpace = cls.createNamespace('clsNameSpace');
Sequelize.useCLS(clsNameSpace);
const sequelize = new Sequelize('blog','root','69824686',{ // orm
    host:'localhost',
    dateStrings:true,
    dialect: 'mysql',
    logging:false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    timezone: '+08:00'
})
sequelize
    .authenticate()
    .then(()=>{
        console.log('sequelize is ready')
    })
    .catch(err=>{
        console.error('error',err);
    })
const Op = Sequelize.Op;
// define data obj model S 之后应该也要拆分出来
// 字段属性 field 自定义key名
const USER = sequelize.define('user',{
    username:Sequelize.STRING,
    password:Sequelize.STRING,
    userid:{
        type:Sequelize.INTEGER,
        primaryKey:true,
        autoIncrement:true 
    },
    sex:Sequelize.STRING,
    email:Sequelize.STRING,
    token:Sequelize.STRING
},{timestamps: false,freezeTableName: true})

const BLOG = sequelize.define('blog',{
    blogId:{
        type:Sequelize.STRING,
        primaryKey:true
    },
    date:{
        type:Sequelize.DATE,
        get(){
            let date = this.getDataValue('date')
            return momentDate(date);
        }
    },
    content:{
        type:Sequelize.TEXT,
        field:'text'
    },
    title:{
        type:Sequelize.STRING
    },
},{timestamps: false,freezeTableName: true});

const COMMENTS = sequelize.define('comments',{
    blogId:{
        type:Sequelize.STRING
    },
    commentsContent:{
        type:Sequelize.STRING
    },
    commentsName:{
        type:Sequelize.STRING
    },
    commentsToken:Sequelize.STRING,
    commentsDate:{
        type:Sequelize.DATE,
        field:'date',
        get(){
            let date = this.getDataValue('date')
            return momentDate(date);
        }
    },
    id:{
        type:Sequelize.STRING,
        primaryKey:true
    }
},{timestamps: false,freezeTableName: true});

const replycomments = sequelize.define('replycomments',{
    replyText:Sequelize.STRING,
    replyDate:{
        type:Sequelize.STRING,
        get(){
            const date = this.getDataValue('replyDate');
            return momentDate(date);
        }
    },
    commentsId:Sequelize.STRING,
    toToken:Sequelize.STRING,
    fromToken:Sequelize.STRING,
    toName:Sequelize.STRING,
    fromName:Sequelize.STRING,
    id:{
        type:Sequelize.INTEGER,
        primaryKey:true
    },
    blogId:Sequelize.STRING
},{timestamps: false,freezeTableName: true});
USER.hasMany(BLOG,{
    sourceKey:'token',
    foreignKey:'userToken'
})
BLOG.hasMany(COMMENTS,{
    foreignKey:'blogId'
})
COMMENTS.hasMany(replycomments,{
    foreignKey:'commentsId',
    sourceKey:'id'
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
    let url = ['/register','/logon'] //里面的请求不需要带token
    if( url.indexOf(req.originalUrl) === -1 ){

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

app.post('/register',(req, res)=>{
    let param = req.body;
    let username = param.userName;
    let pwd = param.pwd;
    let email = param.email;
    let sex = param.sex;
    let token = uuid.v4().replace(/-/g,'');
    USER.findOrCreate({
        where:{
            username:username
        },
        defaults:{
            password:pwd,
            sex:sex,
            email:email,
            token:token,
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
                        token:token
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

app.post('/logon',(req,res)=>{
    let param = req.body;
    let username = param.user;
    let password = param.pwd;
    let data = {};
    connection.query(`SELECT * FROM user where username = "${username}"`,(err, rst, fields)=>{
        if( err ){
            throw err
        }
        let successBol = true;
        if(rst && rst.length ){
            rst.forEach(ele => {
               if( ele.password === password ){

                    delete ele.password;
                    delete ele.userid;

                    data.status = SUCCESS;
                    data.data = ele;
                    res.status(200).json(data);
                    successBol = false;
                    return;
               }
            });
            if( successBol ){
                data.status = FAIL;
                data.errMsg = '密码错误';
                res.status(200).json(data);
            }
        }else{
            data.status = FAIL;
            data.errMsg = '请输入正确的用户账号';
            res.status(200).json(data);
        }
    })
})


// blog S 后期需要拆分开
app.post('/get-blog',(req, res)=>{

    try {
        var token = req.body.token;
    } catch (error) {
        let data = {
            status:FAIL,
            data:'请重新登录'
        }
        return res.send(data)
    }
    
    let mysql = `select title, from blog`;
    mySqlHandle(mysql)
    .then(rst=>{
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
})

app.post('/add-blog',(req, res)=>{
    let param = req.body;
    let userToken = param.token;
    let text = param.text;
    let title = param.title;
    let date = nowTime();
    let blogId = new Date().getTime()+userToken+'';
    BLOG.create({
        userToken:userToken,
        content:text,
        title:title,
        date:date,
        blogId:blogId
    })
    .then(()=>{
        let data = {
            status:SUCCESS,
            data:''
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
    let mysql = `insert into blog (userToken,date,text,blogId,title) 
                    values( "${userToken}", "${date}", "${text}", "${blogId}", "${title}")`;
})

app.post('/delete-blog',(req, res)=>{
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

app.post('/get-blog-by-id',(req, res)=>{
    let token = req.body.token;
    let id = req.body.id;
    BLOG.findOne({
        where:{blogId:id},
        include:[{
            model:COMMENTS,
            as:'comments',
            include:[{
                model:replycomments,
                as:'replycomments',
                attributes: { exclude: ['id'] }
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

app.post('/blog-comments',(req, res)=>{
    let param = req.body;
    let obj = {
        blogId:param.blogId,
        commentsContent:param.text,
        date:nowTime(),
        commentsToken:param.token,
        id:'' + param.blogId + new Date().getTime(),
        commentsName:param.commentsName
    }
    let sql = insertSql('comments',obj);
    mySqlHandle(sql)
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
})

app.post('/delete-comments',(req, res)=>{
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

app.post('/reply-comments',(req, res)=>{
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
// blog E
const port = process.env.port || 8082;
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

function momentDate(time){
    return moment(time).format('YYYY-MM-DD HH:mm:ss');
}
// common function E
