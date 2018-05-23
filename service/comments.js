var express = require('express');
var router = express.Router();

const util = require('../common');
const { nowTime,errHandle,mySqlHandle } = util;

const sequelize = require('../config/sequelizeConfig');
const {FAIL,SUCCESS,DEFAULT_BOY_ICON,DEFAULT_GIRL_ICON,DEFAULT_USER_BACKGROUND,IMAGE_QUALITY} = require('../config/config');
const { USER,BLOG,COMMENTS,replycomments } = require('../sequelizeModel/relationMain');
const {multiparty,fs,images} = require('../lib');

router.route('/blog-comments')
.post((req,res)=>{
    let param = req.body;
    let obj = {
        blogId:param.blogId,
        commentsContent:param.text,
        commentsDate:nowTime(),
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
})

router.route('/delete-comments')
.post((req,res)=>{
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
        errHandle(err,'delete-comments')
    })
})

router.route('/reply-comments')
.post((req,res)=>{
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

module.exports = router;