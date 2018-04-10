const util = require('../common');
const { nowTime,errHandle,mySqlHandle } = util;

const sequelize = require('../config/sequelizeConfig');
const {FAIL,SUCCESS,DEFAULT_BOY_ICON,DEFAULT_GIRL_ICON,DEFAULT_USER_BACKGROUND,IMAGE_QUALITY} = require('../config/config');
const { USER,BLOG,COMMENTS,replycomments } = require('../sequelizeModel/relationMain');

const logon = (req,res)=>{
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
}

module.exports = logon;