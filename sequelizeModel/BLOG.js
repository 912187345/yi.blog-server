const Sequelize = require('sequelize'); 
const sequelize = require('../sequelizeConfig');
const utl = require('../common');
module.exports = sequelize.define('blog',{
    blogId:{
        type:Sequelize.STRING,
        primaryKey:true
    },
    date:{
        type:Sequelize.DATE,
        get(){
            let date = this.getDataValue('date')
            return utl.momentDate(date);
        }
    },
    updateTime:{
        type:Sequelize.DATE,
        get(){
            let date = this.getDataValue('updateTime')
            return utl.momentDate(date);
        }
    },
    content:{
        type:Sequelize.TEXT,
        field:'text'
    },
    title:{
        type:Sequelize.STRING
    },
    userToken:{
        type:Sequelize.STRING
    }
},{timestamps: false,freezeTableName: true});