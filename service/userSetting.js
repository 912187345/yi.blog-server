var express = require('express');
var router = express.Router();

const util = require('../common');
const { nowTime,errHandle } = util;

const sequelize = require('../config/sequelizeConfig');
const {FAIL,SUCCESS,DEFAULT_BOY_ICON,DEFAULT_GIRL_ICON,DEFAULT_USER_BACKGROUND,IMAGE_QUALITY} = require('../config/config');
const { USER } = require('../sequelizeModel/relationMain');
const {multiparty,fs,images} = require('../lib');
router.route('/upload-head-image')
.post((req,res)=>{
    let form = new multiparty.Form({uploadDir:'./static/userHeaderIcon'})
    form.parse(req,(err, fields, files)=>{
        let inputFile = files.file[0];
        let filePath = files.file[0].path;
        let token = fields.token[0];
        let newHeadName = '/userHeaderIcon/'+fields.token[0]+new Date().getTime()+'.jpg';
        let renamePath = './static' + newHeadName;

        sequelize.transaction((t)=>{
            return USER.findOne({
                where:{
                    token:token
                }
            })
            .then((rst)=>{
                return new Promise((res,rej)=>{
                    if(rst.headImg && rst.headImg !== DEFAULT_BOY_ICON && rst.headImg !== DEFAULT_GIRL_ICON){
                        fs.unlink('./static'+rst.headImg,(err)=>{
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
                                    quality:IMAGE_QUALITY
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
            errHandle(err,'upload-head-image');
        })
    }) 
});

router.route('/set-background')
.post((req,res)=>{
    let form = new multiparty.Form({uploadDir:'./static/bg'});
    form.parse(req,(err, fields, files)=>{
        let inputFile = files.file[0];
        let filePath = files.file[0].path;
        let token = fields.token[0];
        let newBackground = '/bg/'+fields.token[0]+new Date().getTime()+'.jpg';
        let renamePath = './static' + newBackground;

        sequelize.transaction(()=>{
            return USER.findOne({
                where:{token:token}
            })
            .then((rst)=>{
                return new Promise((res,rej)=>{
                    if(rst.background && rst.background !== DEFAULT_USER_BACKGROUND){
                        fs.unlink('./static'+rst.background,(err)=>{
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
                                    quality:IMAGE_QUALITY
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
});

router.route('/edit-user')
.post((req,res)=>{
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

module.exports = router;