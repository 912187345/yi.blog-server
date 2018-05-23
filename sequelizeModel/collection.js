const Sequelize = require('sequelize'); 
const sequelize = require('../config/sequelizeConfig');
const utl = require('../common');

module.exports = sequelize.define('collection',{
    blogId:{
        type:Sequelize.STRING
    },
    token:{
        type:Sequelize.STRING
    },
    id:{
        type:Sequelize.INTEGER,
        primaryKey:true
    }
},{timestamps: false,freezeTableName: true});