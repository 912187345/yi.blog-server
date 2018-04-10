const Sequelize = require('sequelize'); 
const sequelize = require('../config/sequelizeConfig');
const utl = require('../common');
module.exports = sequelize.define('blog',{
    blogId:{
        type:Sequelize.STRING,
        primaryKey:true
    },
    date:{
        type:Sequelize.DATE,
        get(){
            try{
                let date = this.getDataValue('date')
                return utl.momentDate(date);
            }catch(err){
                return this.getDataValue('date');
            }
        }
    },
    updateTime:{
        type:Sequelize.DATE,
        get(){
            try{
                let date = this.getDataValue('updateTime')
                return utl.momentDate(date);
            }catch(err){
                return this.getDataValue('updateTime');
            }
            
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