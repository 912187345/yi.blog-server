const USER = require('./USER');
const COMMENTS = require('./COMMENTS');
const BLOG = require('./BLOG');
const replycomments = require('./replycomments');
const collection = require('./collection');
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
        targetKey:'token',
        through:'collection'
    })
    BLOG.hasMany(COMMENTS,{
        foreignKey:'blogId'
    })
    
    COMMENTS.belongsTo(USER,{
        targetKey:'token',
        foreignKey:'commentsToken',
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

    USER.belongsToMany(BLOG,{
        as:'collectionBlog',
        through:'collection',
        foreignKey:'token',
        otherKey:'blogId'
    })
    BLOG.belongsToMany(USER,{
        as:'collectionUser',
        through:'collection',
        foreignKey:'blogId',
        otherKey:'token'
    })
}
main()
module.exports = {
    USER:USER,
    COMMENTS:COMMENTS,
    BLOG:BLOG,
    replycomments:replycomments,
    collection:collection
};