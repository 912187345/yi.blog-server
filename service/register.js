const util = require('../common');
const { nowTime,errHandle,mySqlHandle } = util;
const {uuid} = require('../lib');
const sequelize = require('../config/sequelizeConfig');
const {FAIL,SUCCESS,DEFAULT_BOY_ICON,DEFAULT_GIRL_ICON,DEFAULT_USER_BACKGROUND,IMAGE_QUALITY} = require('../config/config');
const { USER,BLOG,COMMENTS,replycomments } = require('../sequelizeModel/relationMain');
const nodemailer = require('nodemailer');

const register = (req,res)=>{
    let param = req.body;
    let username = param.userName;
    let pwd = param.pwd;
    let email = param.email;
    let sex = param.sex;
    let token = uuid.v4().replace(/-/g,'');
    let defaultHeadImg = sex === 'boy' ? DEFAULT_BOY_ICON : DEFAULT_GIRL_ICON;
    let registerDate = util.nowTime();
    USER.findOrCreate({
        where:{
            username:username
        },
        defaults:{
            password:pwd,
            sex:sex,
            email:email,
            token:token,
            headImg:defaultHeadImg,
            registerDate:registerDate
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
                    headImg:defaultHeadImg,
                    registerDate:registerDate
                }
            }
            res.send(data);
            const param = {
                host:'smtp.qq.com',
                secure:true,
                port:465,
                auth:{
                    user:'912187345@qq.com',
                    pass:'abc'
                },
                "domains": [
                    "qq.com"
                ],
            }
            const mailOptions = {
                from:'易博客 <912187345@qq.com>',
                to:email,
                subject:'欢迎使用易博客',
                html:`<div>hi ${username} ，感谢您注册易博客，希望您能帮我在github上点个start(网站上有github地址)，欢迎加我QQ一起探讨技术问题，一起学习一起成长~</div>`
            }
            const transporter = nodemailer.createTransport(param);
            transporter.sendMail(mailOptions,(error, info)=>{
                
            });
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
}

module.exports = register;