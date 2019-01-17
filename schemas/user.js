module.exports = `
  type User  {
    id: ID
    email: String
    password: String
      rolesFilter(search: searchRoleInput, order: [ orderRoleInput ], pagination: paginationInput): [Role]
    countFilteredRoles(search: searchRoleInput) : Int
  }

  type VueTableUser{
    data : [User]
    total: Int
    per_page: Int
    current_page: Int
    last_page: Int
    prev_page_url: String
    next_page_url: String
    from: Int
    to: Int
  }

  enum UserField {
    id 
    email  
    password  
  }

  input searchUserInput {
    field: UserField
    value: typeValue
    operator: Operator
    search: [searchUserInput]
  }

  input orderUserInput{
    field: UserField
    order: Order
  }

  type Query {
    users(search: searchUserInput, order: [ orderUserInput ], pagination: paginationInput ): [User]
    readOneUser(id: ID!): User
    countUsers(search: searchUserInput ): Int
    vueTableUser : VueTableUser  }

    type Mutation {
    addUser( email: String, password: String , addRoles:[ID] ): User
    deleteUser(id: ID!): String!
    updateUser(id: ID!, email: String, password: String , addRoles:[ID], removeRoles:[ID] ): User!
    bulkAddUserXlsx: [User]
    bulkAddUserCsv: [User]
}
  `;