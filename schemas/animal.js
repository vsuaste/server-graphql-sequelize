module.exports = `
    type animal{
        """
        @original-field
        """
        animal_id: ID
        """
        @original-field

        """
        animal_name: String

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

        """
        @original-field

        """
        farm_id: String
        farm(search: searchFarmInput): farm
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
        animal_id
        animal_name
        category
        age
        weight
        health
        birthday
        personality
        farm_id
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

    input bulkAssociationAnimalWithFarmIdInput{
        animal_id: ID!
        farm_id: ID!
    }

    type Query {
        animals(search: searchAnimalInput, order: [ orderAnimalInput ], pagination: paginationInput! ): [animal]
        readOneAnimal(animal_id: ID!): animal
        countAnimals(search: searchAnimalInput ): Int
        animalsConnection(search:searchAnimalInput, order: [ orderAnimalInput ], pagination: paginationCursorInput! ): AnimalConnection
    }

    type Mutation {
        addAnimal(animal_id: ID!, animal_name: String, category: String, age: Int, weight: Float, health: Boolean, birthday: DateTime, personality: [String], addFarm:ID, skipAssociationsExistenceChecks:Boolean = false): animal!
        updateAnimal(animal_id: ID!, animal_name: String, category: String, age: Int, weight: Float, health: Boolean, birthday: DateTime, personality: [String], addFarm:ID, removeFarm:ID, skipAssociationsExistenceChecks:Boolean = false): animal!
        deleteAnimal(animal_id: ID!): String!
        bulkAddAnimalCsv: String!
        bulkAssociateAnimalWithFarmId(bulkAssociationInput: [bulkAssociationAnimalWithFarmIdInput], skipAssociationsExistenceChecks:Boolean = false): String!
        bulkDisAssociateAnimalWithFarmId(bulkAssociationInput: [bulkAssociationAnimalWithFarmIdInput], skipAssociationsExistenceChecks:Boolean = false): String!
    }
`;