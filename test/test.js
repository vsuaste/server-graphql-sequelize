const expect = require('chai').expect;
const helper = require('../utils/helper');
const resolvers = require('../resolvers/index');

describe('Non-empty array', function() {
    it('1. Undefined', function() {
        let val = undefined;
        expect(helper.isNonEmptyArray(val)).to.be.false;
    });

    it('2. Null', function() {
        let val = null;
        expect(helper.isNonEmptyArray(val)).to.be.false;
    });

    it('3. Simple type', function() {
        let val = 0;
        expect(helper.isNonEmptyArray(val)).to.be.false;
    });

    it('4. Empty Object', function() {
        let val = {};
        expect(helper.isNonEmptyArray(val)).to.be.false;
    })

    it('5. Object', function() {
        let val = {zero: 0, one: 1};
        expect(helper.isNonEmptyArray(val)).to.be.false;
    });

    it('6. Empty Array', function() {
        let val = [];
        expect(helper.isNonEmptyArray(val)).to.be.false;
    });

    it('7. Non-Empty Array', function() {
        let val = [0];
        expect(helper.isNonEmptyArray(val)).to.be.true;
    });
});

describe('Not undefined and not null', function() {
    it('1. Undefined', function() {
        let val = undefined;
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.false;
    });

    it('2. Null', function() {
        let val = null;
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.false;
    })

    it('3. Zero', function() {
        let val = 0;
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.true;
    })

    it('4. Simple type', function() {
        let val = 1;
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.true;
    })

    it('5. Empty Object', function() {
        let val = {};
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.true;
    })

    it('6. Object', function() {
        let val = {zero: 0, one: 1};
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.true;
    })

    it('7. Empty Array', function() {
        let val = [];
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.true;
    })

    it('8. Array', function() {
        let val = [0];
        expect(helper.isNotUndefinedAndNotNull(val)).to.be.true;
    })
})

describe('Count Records in Association Arguments', function() {
    it('1. Integers first test', function() {
        expect(helper.countRecordsInAssociationArgs({addDogs: 2, addCats: 1}, ['addDogs', 'addCats'])).to.equal(2);
    })
    it('2. Integer second test', function() {
        expect(helper.countRecordsInAssociationArgs({addDogs: 2, addCats: 1, addHamsters: 1}, ['addDogs', 'addCats', 'addHamsters'])).to.equal(3);
    })
    it('3. Arrays first test', function() {
        expect(helper.countRecordsInAssociationArgs({addDogs: [4, 2], addCats: 1}, ['addDogs', 'addCats'])).to.equal(3);
    })
    it('4. Arrays second test', function() {
        expect(helper.countRecordsInAssociationArgs({addDogs: [4, 2], addCats: 1, addHamsters: 1}, ['addDogs', 'addCats', 'addHamsters'])).to.equal(4);
    })
});

describe('Unique', function() {
    it('1. Unique array test', function() {
        expect(helper.unique([1, 1, 2, 3, 2])).to.deep.equal([1, 2, 3]);
    });

    it('2. Unique without sorting', function() {
        expect(helper.unique([2, 3, 2, 4, 1, 5])).to.deep.equal([2, 3, 4, 1, 5]);
    })
})

describe('Sanitize association arguments', function() {
    it('1, NOP for already sane arguments', function() {
        const firstArguments = {addDogs: [4, 2], addCats: 1, addHamsters: 2};
        let originalArguments = Object.assign({}, firstArguments);
        let newArguments = helper.sanitizeAssociationArguments(originalArguments, ['addDogs', 'addCats', 'addHamsters']);
        expect(newArguments).to.deep.equal(firstArguments);
        expect(originalArguments).to.deep.equal(firstArguments);
    })

    it('2. One argument to be sanitized', function() {
        const firstArguments = {addDogs: [4, 2, 4, 3], addCats: 1, addHamsters: 2};
        let originalArguments = Object.assign({}, firstArguments);
        let newArguments = helper.sanitizeAssociationArguments(originalArguments, ['addDogs', 'addCats', 'addHamsters']);
        expect(newArguments).to.deep.equal({addDogs: [4, 2, 3], addCats: 1, addHamsters: 2});
        expect(originalArguments).to.deep.equal(firstArguments);
    })

    it('3. All arguments to be sanitized', function() {
        const firstArguments = {addDogs: [4, 2, 4, 3], addCats: [1, 1, 2], addHamsters: [2, 2]};
        let originalArguments = Object.assign({}, firstArguments);
        let newArguments = helper.sanitizeAssociationArguments(originalArguments, ['addDogs', 'addCats', 'addHamsters']);
        expect(newArguments).to.deep.equal({addDogs: [4, 2, 3], addCats: [1, 2], addHamsters: [2]});
        expect(originalArguments).to.deep.equal(firstArguments);
    })
})