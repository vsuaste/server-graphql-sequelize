module.exports = `
    type farm{
        """
        @original-field
        """
        farm_id: ID
        """
        @original-field

        """
        farm_name: String

        """
        @original-field

        """
        owner: String
        """
        @search-request
        """
        animalsFilter(search: searchAnimalInput, order: [ orderAnimalInput ], pagination: paginationInput!): [animal]
    
    
        """
        @search-request
        """
        animalsConnection(search: searchAnimalInput, order: [ orderAnimalInput ], pagination: paginationCursorInput!): AnimalConnection
    
        """
        @count-request
        """
        countFilteredAnimals(search: searchAnimalInput) : Int
    }
    type FarmConnection{
        edges: [FarmEdge]
        pageInfo: pageInfo!
    }

    type FarmEdge{
        cursor: String!
        node: farm!
    }

    enum farmField {
        farm_id
        farm_name
        owner
    }

    input searchFarmInput {
        field: farmField
        value: String
        valueType: InputType
        operator: Operator
        search: [searchFarmInput]
    }

    input orderFarmInput{
        field: farmField
        order: Order
    }


    type Query {
        farms(search: searchFarmInput, order: [ orderFarmInput ], pagination: paginationInput! ): [farm]
        readOneFarm(farm_id: ID!): farm
        countFarms(search: searchFarmInput ): Int
        farmsConnection(search:searchFarmInput, order: [ orderFarmInput ], pagination: paginationCursorInput! ): FarmConnection
    }

    type Mutation {
        addFarm(farm_id: ID!, farm_name: String, owner: String, addAnimals:[ID], skipAssociationsExistenceChecks:Boolean = false): farm!
        updateFarm(farm_id: ID!, farm_name: String, owner: String, addAnimals:[ID], removeAnimals:[ID], skipAssociationsExistenceChecks:Boolean = false): farm!
        deleteFarm(farm_id: ID!): String!
        bulkAddFarmCsv: String!
    }
`;