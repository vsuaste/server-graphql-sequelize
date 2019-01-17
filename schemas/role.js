module.exports = `
  type Role  {
    id: ID
    name: String
    description: String
      usersFilter(search: searchUserInput, order: [ orderUserInput ], pagination: paginationInput): [User]
    countFilteredUsers(search: searchUserInput) : Int
  }

  type VueTableRole{
    data : [Role]
    total: Int
    per_page: Int
    current_page: Int
    last_page: Int
    prev_page_url: String
    next_page_url: String
    from: Int
    to: Int
  }

  enum RoleField {
    id 
    name  
    description  
  }

  input searchRoleInput {
    field: RoleField
    value: typeValue
    operator: Operator
    search: [searchRoleInput]
  }

  input orderRoleInput{
    field: RoleField
    order: Order
  }

  type Query {
    roles(search: searchRoleInput, order: [ orderRoleInput ], pagination: paginationInput ): [Role]
    readOneRole(id: ID!): Role
    countRoles(search: searchRoleInput ): Int
    vueTableRole : VueTableRole  }

    type Mutation {
    addRole( name: String, description: String , addUsers:[ID] ): Role
    deleteRole(id: ID!): String!
    updateRole(id: ID!, name: String, description: String , addUsers:[ID], removeUsers:[ID] ): Role!
    bulkAddRoleXlsx: [Role]
    bulkAddRoleCsv: [Role]
}
  `;