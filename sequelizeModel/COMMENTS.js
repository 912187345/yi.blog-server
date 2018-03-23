const Sequelize = require('sequelize'); 
const sequelize = require('../sequelizeConfig');
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
            let date = this.getDataValue('date')
            return utl.momentDate(date);
        }
    },
    id:{
        type:Sequelize.STRING,
        primaryKey:true
    }
},{timestamps: false,freezeTableName: true});