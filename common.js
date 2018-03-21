const moment = require('moment');
module.exports = (()=>{
    return {
        momentDate(time){
            return moment(time).format('YYYY-MM-DD HH:mm:ss');
        }
    }
})()