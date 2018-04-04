const Sequelize = require('sequelize'); 
const sequelize = require('../sequelizeConfig');
module.exports = sequelize.define('user',{
    username:Sequelize.STRING,
    password:Sequelize.STRING,
    userid:{
        type:Sequelize.INTEGER,
        primaryKey:true,
        autoIncrement:true 
    },
    sex:Sequelize.STRING,
    email:Sequelize.STRING,
    token:Sequelize.STRING,
    headImg:Sequelize.STRING,
    background:Sequelize.STRING,
    registerDate:Sequelize.DATE
},{timestamps: false,freezeTableName: true})