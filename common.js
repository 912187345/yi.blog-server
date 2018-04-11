const fs = require('fs');
const moment = require('moment');
const cheerio = require('cheerio');
const images = require('images');
const config = require('./config/config');
const connection = require('./config/mysqlConnection');
const log4js = require('log4js');

log4js.configure({
    replaceConsole:true,
    appenders:{
        stdout:{
            type:'stdout'
        },
        err:{
            type:'dateFile',
            filename:'logs/errlog/',
            pattern:'err-yyyy-MM-dd  hh:mm.log',
            alwaysIncludePattern:true
        }
    },
    categories:{
        default: { appenders: ['stdout', 'err'], level: 'debug' },
        err:{ appenders:['stdout', 'err'],level:'error' }
    }
})

const errLogger = log4js.getLogger('err');
const blogImgPath = config.blogImgPath;

module.exports = (()=>{
    return {
        momentDate(time){
            return moment(time).format('YYYY-MM-DD HH:mm:ss');
        },
        base64Change(obj){ //base64转换成img
            return new Promise((res,rej)=>{
                let text = obj.text;
                let $ = cheerio.load(text);
                let img = $('img');
                let fileName = obj.fileName;
                let promiseArr = [];
                if( !img.length ){ 
                    return res(text);
                }
                let num = 0;
                let that = this;
                return changeImg(text);
                function changeImg(text){
                    if( num === img.length ){
                       return res(text);
                    }
                    
                    let imgSrc = img[num].attribs.src;
                    if(!(/^data:image\/\w+;base64,/.test(imgSrc))){
                        num++;
                        return changeImg(text);
                    }
                    let base64Data = imgSrc.replace(/^data:image\/\w+;base64,/, "");
                    let dataBuffer = new Buffer(base64Data,'base64');
                    let opt = {
                        fileName:blogImgPath+fileName+num+'.jpg',
                        dataBuffer:dataBuffer
                    }
                    try{
                        that.writeFile(opt)
                        .then((rst)=>{
                            let path = opt.fileName.replace('./static','');
                            text = text.replace(imgSrc,path);
                            num++;
                            changeImg(text);
                            images(opt.fileName)
                            .save(opt.fileName,{
                                quality:config.IMAGE_QUALITY
                            })
                        })
                    } catch(err) {
                        that.errHandle(err);
                        num++;
                        changeImg(text);
                    }
                }
            })
        },
        deleteImg(obj){//删除图片
            let text = obj.text;
            return new Promise((res,rej)=>{
                let $ = cheerio.load(text);
                let img = $('img');

                if( !img.length ){ return res() }

                if( obj.editText ){
                    var e = cheerio.load(obj.editText);
                    var editImg = e('img');
                    var editSrcArray = [];
                    for( let i = 0, len = editImg.length; i < len ;i++ ){
                        editSrcArray.push(editImg[i].attribs.src)
                    }
                }

                for( let i = 0; i < img.length; i++ ){
                    let path = img[i].attribs.src;
                    if( obj.editText ){
                        if(editSrcArray.indexOf(path) === -1){
                            this.deleteFile('/static' + path)
                            .then(()=>{
                                
                            },err=>{ res() })
                        }
                        if(i+1 === img.length){
                            res();
                        }
                    } else {

                        this.deleteFile('/static' + path)
                        .then(()=>{
                            if(i+1 === img.length){
                                res();
                            }
                        },err=>{ res() })
                    }
                }
            })
        },
        writeFile(opt){
            return new Promise((res,rej)=>{
                fs.writeFile(opt.fileName,opt.dataBuffer,(err,file)=>{
                    if(err){
                        throw err;
                    }else{
                        res(file);
                    }
                })
            })
        },
        deleteFile(path){
            return new Promise((res,rej)=>{
                fs.unlink(__dirname+path,(err)=>{
                    if(err) {
                        // this.errHandle(err);
                        rej()
                    } else {
                        res();
                    }
                })
                
            })
        },
        nowTime(){
            var time = new Date();
            return `${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()} ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
        },
        errHandle(err,type=''){
            errLogger.error(type+''+err)
        },
        mySqlHandle(sql){
            return new Promise((res, rej)=>{
                connection.query(sql,(err, rst, fields)=>{
        
                    if( err ) this.errHandle(err)
        
                    if( rst ){
        
                        res(rst)
                    }else if( fields ){
        
                        rej(fields);
                    }
                })
            })
        }
    }
})()