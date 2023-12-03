const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');

// Định nghĩa schema GraphQL
const typeDefs = `
  type User {
    id: ID!
    name: String!
    age: Int!
  }

  type Query {
    getUser(id: ID!): User
    getAllUsers: [User]
  }

  type Mutation {
    createUser(name: String!, age: Int!): User
    updateUser(id: ID!, name: String, age: Int): User
    deleteUser(id: ID!): User
  }

  type Subscription {
    userAdded: User
  }
`;

// Dữ liệu giả định
const users = [
  { id: '1', name: 'Anh Quân', age: 21 },
  { id: '2', name: 'Anh Quân 2', age: 22 },
];

// Hàm resolver
const resolvers = {
  Query: {
    getUser: ({ id }) => users.find(user => user.id === id),
    getAllUsers: () => users,
  },
  Mutation: {
    createUser: (_, { name, age }) => {
      if (!name || !age) {
        throw new Error("Name and age are required!");
      }
  
      const newUser = { id: String(users.length + 1), name, age };
      users.push(newUser);
      pubsub.publish('userAdded', { userAdded: newUser });
      return newUser;
    },
    updateUser: ({ id, name, age }) => {
      const user = users.find(user => user.id === id);
      if (user) {
        user.name = name || user.name;
        user.age = age || user.age;
      }
      return user;
    },
    deleteUser: ({ id }) => {
      const index = users.findIndex(user => user.id === id);
      if (index !== -1) {
        const [deletedUser] = users.splice(index, 1);
        console.log('Deleted User:', deletedUser);
        return deletedUser ? deletedUser : {}; // Trả về deletedUser nếu tồn tại, ngược lại trả về đối tượng trống
      }
      console.log('User not found for deletion');
      return {}; // Trả về đối tượng trống nếu không tìm thấy người dùng
    }, 
  },
  Subscription: {
    userAdded: {
      subscribe: () => pubsub.asyncIterator(['userAdded']),
      resolve: (payload) => payload.userAdded || {}, // Chắc chắn trả về đối tượng User hoặc đối tượng trống
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const pubsub = new PubSub();

const app = express();
const PORT = 4000; // Định nghĩa PORT ở đây

app.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true,
}));

const server = createServer(app);

// Thêm hỗ trợ WebSocket cho Express
server.listen(PORT, () => {
  console.log(`GraphQL Server is running at http://localhost:${PORT}/graphql`);

  // Kích hoạt server subscription
  new SubscriptionServer({
    schema,
    execute,
    subscribe,
  }, {
    server,
    path: '/subscriptions',
  });
});
