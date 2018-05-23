var express = require('express');
var router = express.Router();

const util = require('../common');
const { nowTime,errHandle,mySqlHandle } = util;

const sequelize = require('../config/sequelizeConfig');

const {
    FAIL,
    SUCCESS,
    DEFAULT_BOY_ICON,
    DEFAULT_GIRL_ICON,
    DEFAULT_USER_BACKGROUND,
    IMAGE_QUALITY,
    URL
} = require('../config/config');

const { 
    USER,
    BLOG,
    COMMENTS,
    replycomments,
    collection
} = require('../sequelizeModel/relationMain');

const {
    multiparty,
    fs,
    images,
    cheerio
} = require('../lib');

router.route('/get-blog')
.post((req,res)=>{
    let param = req.body;
    let limit = param.limit || 10;
    let offset = param.offset || 0;
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
});

router.route('/add-blog')
.post((req,res)=>{
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
            errHandle(err,'add-blog');
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
        errHandle(err,'add-blog');
    })
})

router.route('/get-blog-by-id')
.post((req,res)=>{
    let token = req.body.token;
    let id = req.body.id;
    let addUrl = req.body.addUrl || null;
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
                }],
            },{
                model:USER,
                attributes:['headImg','username'],
                as:'commentsUser'
            }]
        },{
            model:USER,
            attributes:['headImg','username'],
        }],
        order:[[COMMENTS,'date','ASC']]
    })
    .then(rst=>{
        let data = {
            status:SUCCESS,
            data:rst
        }
        if( addUrl ){
            let $ = cheerio.load(data.data.content);
            let img = $('img');
            if( img.length ){
                for( let i = 0, len = img.length; i < len;i++ ){
                    data.data.content = data.data.content.replace(img[i].attribs.src,URL+img[i].attribs.src);
                }
            }
        }
        let sql = `select token as "collectionUser", (select token from collection where blogId="${id}" and token="${token}") as "collection" from collection where blogId="${id}"`;
        mySqlHandle(sql)
        .then((sqlData)=>{
            data.data.dataValues.collection = {};
            data.data.dataValues.collection.collectionNum = sqlData.length || 0;
            data.data.dataValues.collection.collectionBol = sqlData[0]? (sqlData[0].collection?true:false) : false
            res.send(data);
        })
        .catch(()=>{
            data.data.dataValues.collection = {
                collectionNum:0,
                collectionBol:false
            };
            res.send(data)
        })
    })    
})

router.route('/edit-blog')
.post((req,res)=>{
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
                return util.base64Change({text:text,fileName:blogId+new Date().getTime()})
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
        errHandle(err,'edit-blog');
    })
})

router.route('/delete-blog')
.post((req,res)=>{
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
        errHandle(err,'delete-blog')
    })
})

router.route('/collection')
.post((req,res)=>{
    let type = req.body.type;
    let userToken = req.body.token;
    let blogId = req.body.blogId;
    
    let successData = {
        status:SUCCESS
    }
    let errorData = {
        status:FAIL
    }

    if( type === 'add' ){

        collection.create({
            blogId:blogId,
            token:userToken
        })
        .then(()=>{
            res.send(successData);
        })
        .catch(err=>{
            util.errHandle(err,'/collection')
            res.send(errorData);
        })
    } else if( type === 'cancel' ){

        collection.destroy({
            where:{
                blogId:blogId,
                token:userToken
            }
        })
        .then(data=>{
            res.send(successData);
        })
        .catch(err=>{
            util.errHandle(err,'/collection')
            res.send(errorData);
        })
    }
})

router.route('/get-collection')
.post((req,res)=>{
    let userToken = req.body.token;
    let param = req.body;
    let limit = param.limit || 10;
    let offset = param.offset || 0;
    let sql = `select * from get_collection where userToken="${userToken}" LIMIT ${offset},${limit}`;
    mySqlHandle(sql)
    .then(rst=>{
        for( let i = 0, len = rst.length; i< len ;i++ ){
            rst[i].date = util.momentDate(rst[i].date);
        }
        let data={
            status:SUCCESS,
            data:rst
        }
        res.send(data);
    })
    .catch(err=>{
        let data={
            status:FAIL,
            data:err
        }
        res.send(data);
    })
})

module.exports = router;