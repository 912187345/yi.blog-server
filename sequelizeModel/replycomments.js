const Sequelize = require('sequelize'); 
const sequelize = require('../config/sequelizeConfig');
const utl = require('../common');

const USER = require('./USER');
const COMMENTS = require('./COMMENTS');
const BLOG = require('./BLOG');

const replycomments = sequelize.define('replycomments',{
    replyText:Sequelize.STRING,
    replyDate:{
        type:Sequelize.STRING,
        get(){
            try{
                let date = this.getDataValue('replyDate');
                let momentDate = utl.momentDate(date);
                return momentDate;
            }catch(err){
                return this.getDataValue('replyDate');
            }
            
        }
    },
    commentsId:Sequelize.STRING,
    toToken:Sequelize.STRING,
    fromToken:Sequelize.STRING,
    id:{
        type:Sequelize.INTEGER,
        primaryKey:true
    },
    blogId:Sequelize.STRING
},{timestamps: false,freezeTableName: true});

module.exports = replycomments;