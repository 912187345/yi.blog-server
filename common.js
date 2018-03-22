const fs = require('fs');
const moment = require('moment');
const cheerio = require('cheerio');
const images = require('images');

const config = require('./config');
const blogImgPath = config.blogImgPath;

module.exports = (()=>{
    return {
        momentDate(time){
            return moment(time).format('YYYY-MM-DD HH:mm:ss');
        },
        base64Change(obj){ //base64转换成img
            let text = obj.text;
            let $ = cheerio.load(text);
            let img = $('img');
            let fileName = obj.fileName;
            return new Promise((res,rej)=>{
                if( !img.length ){ return res(text) }
                for( let i = 0; i < img.length; i++ ){
                    if( img[i].attribs.src.indexOf('data:image\/\w+;base64') === -1 ){ 
                        continue;
                    }
                    let base64Data = img[i].attribs.src.replace(/^data:image\/\w+;base64,/, "");
                    let dataBuffer = new Buffer(base64Data,'base64');
                    let opt = {
                        fileName:blogImgPath+fileName+i+'.jpg',
                        dataBuffer:dataBuffer
                    }
                    try{
                        this.writeFile(opt)
                        .then((rst)=>{
                            let path = opt.fileName.replace('./static','');
                            text = text.replace(img[i].attribs.src,path);
                            images(opt.fileName)
                            .save(opt.fileName,{
                                quality:50
                            })
                            if( i+1 === img.length ){
                                res(text);
                            }
                        })
                    } catch(err) {
                        rej();
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
        // 如果图片是一样的就不要删除
        deleteImg(obj){//删除图片
            let text = obj.text;
            return new Promise((res,rej)=>{
                let $ = cheerio.load(text);
                let img = $('img');
                if( !img.length ){ return res() }
                for( let i = 0; i < img.length; i++ ){
                    let path = img[i].attribs.src;
                    console.log('path',path);
                    fs.unlink(__dirname+'/static'+path,(err)=>{
                        if(err) {
                            this.errHandle(err);
                            rej()
                        } else {
                            if(i+1 === img.length){
                                res();
                            }
                        }
                    })  
                }
            })
        },
        nowTime(){
            var time = new Date();
            return `${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()} ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
        },
        errHandle(err){
            throw err;
        }
    }
})()