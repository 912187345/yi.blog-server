const moment = require('moment');
const cheerio = require('cheerio');
const images = require('images');
module.exports = (()=>{
    return {
        momentDate(time){
            return moment(time).format('YYYY-MM-DD HH:mm:ss');
        },
        base64Change(obj){ //base64转换成img
            let $ = cheerio.load(obj.text);
            let img = $('img');
            let fileName = obj.fileName;
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
                        console.log(err);
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
        }
    }
})()