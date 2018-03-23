const Sequelize = require('sequelize'); 
const sequelize = require('../sequelizeConfig');
const utl = require('../common');

const USER = require('./USER');
const COMMENTS = require('./COMMENTS');
const BLOG = require('./BLOG');

const replycomments = sequelize.define('replycomments',{
    replyText:Sequelize.STRING,
    replyDate:{
        type:Sequelize.STRING,
        get(){
            const date = this.getDataValue('replyDate');
            return utl.momentDate(date);
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