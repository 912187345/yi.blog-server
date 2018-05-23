const Sequelize = require('sequelize'); 
const sequelize = require('../config/sequelizeConfig');
const utl = require('../common');
module.exports = sequelize.define('comments',{
    blogId:{
        type:Sequelize.STRING
    },
    commentsContent:{
        type:Sequelize.STRING
    },
    commentsToken:Sequelize.STRING,
    commentsDate:{
        type:Sequelize.DATE,
        field:'date',
        get(){
            try{
                let date = this.getDataValue('commentsDate')
                return utl.momentDate(date);
            }catch(err){
                return this.getDataValue('commentsDate');
            }
            
        }
    },
    id:{
        type:Sequelize.STRING,
        primaryKey:true
    }
},{timestamps: false,freezeTableName: true});