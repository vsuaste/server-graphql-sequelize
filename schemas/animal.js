module.exports = `
    type animal{
        """
        @original-field
        """
        _id: ID
        """
        @original-field

        """
        name: String

        """
        @original-field

        """
        category: String

        """
        @original-field

        """
        age: Int

        """
        @original-field

        """
        weight: Float
        """
        @original-field

        """
        health: Boolean
        """
        @original-field

        """
        birthday: DateTime
        """
        @original-field

        """
        personality: [String]
    }
    type AnimalConnection{
        edges: [AnimalEdge]
        pageInfo: pageInfo!
    }

    type AnimalEdge{
        cursor: String!
        node: animal!
    }

    enum animalField {
        _id
        name
        category
        age
        weight
        health
        birthday
        personality
    }

    input searchAnimalInput {
        field: animalField
        value: String
        valueType: InputType
        operator: Operator
        search: [searchAnimalInput]
    }

    input orderAnimalInput{
        field: animalField
        order: Order
    }


    type Query {
        animals(search: searchAnimalInput, order: [ orderAnimalInput ], pagination: paginationInput! ): [animal]
        readOneAnimal(_id: ID!): animal
        countAnimals(search: searchAnimalInput ): Int
        animalsConnection(search:searchAnimalInput, order: [ orderAnimalInput ], pagination: paginationCursorInput! ): AnimalConnection
    }

    type Mutation {
        addAnimal( name: String, category: String, age: Int, weight: Float, health: Boolean, birthday: DateTime, personality: [String], skipAssociationsExistenceChecks:Boolean = false): animal!
        updateAnimal(_id: ID!, name: String, category: String, age: Int, weight: Float, health: Boolean, birthday: DateTime, personality: [String], skipAssociationsExistenceChecks:Boolean = false): animal!
        deleteAnimal(_id: ID!): String!
        bulkAddAnimalCsv: String!
    }
`;