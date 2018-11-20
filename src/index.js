const { ApolloServer, gql, SchemaDirectiveVisitor, AuthenticationError } = require('apollo-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const User = require('../src/models/user');
const Post = require('../src/models/post');
const Comment = require('../src/models/comment');

const SECRET_APP = 'secret token';

function generateToken(userId) {
    return jwt.sign({
        userid: userId
    }, SECRET_APP, { expiresIn: '1h' });
}

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_APP);
        return decoded.userid;
    } catch (error) {
        return null;
    }
}


mongoose.Promise = global.Promise;


// The GraphQL schema
const typeDefs = gql`
    directive @private on FIELD_DEFINITION

    type Avatar {
        url: String
    }

    type User {
        id: ID!
        firstName: String
        lastName: String
        displayName: String
        avatar: Avatar
        email: String
        friends: [User]
        posts: [Post]
    }

    type Post {
        id: ID!
        title: String
        content: String
        creator: User
        likes: Int
        comments: [Comment]
        createdAt: String
    }

    type Comment {
        id: ID!
        message: String
        creator: User
        createdAt: String
    }

    input UserInput {
        firstName: String!
        lastName: String!
        email: String!
        password: String!
    }

    input LoginInput {
        email: String!
        password: String!
    }

    input AvatarInput {
        url: String!
    }

    input PostInput {
        title: String!
        content: String!
    }

    input CommentInput {
        message: String!
        postId: ID!
    }

    type UserLogged {
        user: User!
        token: String!
    }

    type Query {
        me: User @private
        profile(userId: ID): User @private
        feed: [Post] @private
        post(postId: ID!): Post @private
        comments(postId: ID!): [Comment] @private
    }

    type Mutation {
        register(input: UserInput): UserLogged
        login(input: LoginInput): UserLogged
        updateAvatar(input: AvatarInput): User @private
        createPost(input: PostInput): Post @private
        likePost(postId: ID!): Post @private
        commentPost(input: CommentInput): Comment @private
        follow(friend: ID!): User @private
    }
`;


const resolvers = {
    Query: {
        me: (_, $, { models, userid }) => models.User.findOne({ _id: userid }),
        profile: (_, { userId }, { models }) =>  models.User.findOne({ _id: userId }),
        feed: async (_, $, { models, userid }) => {
            const { friends } = await models.User.findOne({ _id: userid });
            return models.Post
                .find({ creator: { $in: friends.contact([userid]) } }, { sort: { createdAt: 1 }})
        },
        post: (_, { postId }, { models }) => models.Post.findOne({ _id: postId }),
        comments: (_, { postId }, { models }) => models.Comment.find({ postId })
    },
    Mutation: {
        register: async (_, { input }, { models }) => {
            const passwordHash = bcrypt.hashSync(input.password, 10);
            const user = new models.User({ ...input, password: passwordHash });
            await user.save();
            const token = generateToken(user.id);
            return {
                user,
                token,
            }
        },
        login: async (_, { input }, { models }) => {
            let user = await models.User.findOne({ email: input.email });
            if (!user) {
                throw new Error('wrong email');
            }
            if(!bcrypt.compareSync(input.password, user.password)) {
                throw new Error('Wrong password');
            }
            const token = generateToken(user.id);
            return {
                user,
                token,
            }
        },
        updateAvatar: async (_, { input }, { models, userid }) => {
            let user = await models.User.findOne({ _id: userid });
            user.avatar = input.url;
            return user.save();
        },
        createPost: (_, { input }, { models, userid }) => {
            const post = new models.Post({ ...input, creator: userid });
            return post.save();
        },
        likePost: async (_, { postId }, { models, userid }) => {
            let post = await models.Post.findOne({ _id: postId })
            post.likes.push(userid);
            return post.save();
        },
        commentPost: (_, { input }, { models, userid }) => {
            const comment = new models.Comment({ ...input, creator: userid });
            return comment.save()
        },
        follow: async (_, { friend }, { models, userid }) => {
            let actualUser = await models.User.findOne({ _id: userid })
            actualUser.friends.push(friend);
            return actualUser.save();
        },      
    },
    User: {
        displayName: (root) => `${root.firstName} ${root.lastName}`,
        avatar: (root) => ({ url: root.avatar }),
        friends: (root, $, { models }) => models.User.find({ _id: { $in: root.friends || [] } }),
        posts: (root, $, { models}) => models.Post.find({ creator: root.id }),
    },
    Post: {
        creator: (root, $, { models }) =>  models.User.findOne({ _id: root.creator }),
        comments: (root, $, { models }) => models.Comment.find({ postId: root.id }),
        likes: (root) => root.likes ? root.likes.length : 0
    },
    Comment: {
        creator: (root, $, { models }) => models.User.findOne({ _id: root.creator })
    }
};

class privateDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = async function(...args) {
            const [, , ctx] = args;
            if (!ctx.userid) {
                throw new AuthenticationError(
                    "You are not authorized to access this resource."
                  );
            } else {
                const result = await resolve.apply(this, args);
                return result;
            }
        }
    }
}


mongoose.connect('mongodb://localhost/demoGoMyCode')
    .then(() => {
        console.log('connected to MongoDB');
        const server = new ApolloServer({
            typeDefs,
            resolvers,
            schemaDirectives: {
                private: privateDirective
              },
            context: ({ req }) => {
                const userid = verifyToken(req.headers.authorization);
                return {
                userid,
                models: {
                    User,
                    Post,
                    Comment,
                }
            };
        },
        });
        server.listen().then(({ url }) => {
            console.log(`🚀  Server ready at ${url}`);
        });
    })
