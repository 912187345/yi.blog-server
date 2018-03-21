const USER = require('./USER');
const COMMENTS = require('./COMMENTS');
const BLOG = require('./BLOG');
const replycomments = require('./replycomments');
function main(){
    USER.hasMany(BLOG,{
        sourceKey:'token',
        foreignKey:'userToken'
    })
    USER.hasMany(COMMENTS,{
        sourceKey:'token',
        foreignKey:'commentsToken'
    })
    USER.hasMany(replycomments,{
        sourceKey:'token',
        foreignKey:'toToken',
    })
    
    BLOG.belongsTo(USER,{
        foreignKey:'userToken',
        targetKey:'token'
    })
    BLOG.hasMany(COMMENTS,{
        foreignKey:'blogId'
    })
    
    COMMENTS.hasOne(USER,{
        foreignKey:'token',
        targetKey:'commentsToken',
        as:'commentsUser'
    })
    COMMENTS.belongsTo(BLOG,{
        foreignKey:'blogId',
        targetKey:'blogId'
    })
    COMMENTS.hasMany(replycomments,{
        foreignKey:'commentsId',
        sourceKey:'id'
    })
    
    replycomments.belongsTo(USER,{
        foreignKey:'toToken',
        targetKey:'token',
        as:'toUser'
    })
    replycomments.belongsTo(USER,{
        foreignKey:'fromToken',
        targetKey:'token',
        as:'fromUser'
    })
    replycomments.belongsTo(COMMENTS,{
        foreignKey:'commentsId',
        sourceKey:'id'
    })
}
module.exports = main;