const expect = require('chai').expect;
const helper = require('../utils/helper');

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