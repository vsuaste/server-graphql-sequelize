
const { Op } = require("sequelize");

/**
 * search Class to parse search argument for any model and translate it so sequelize model will accept it
 */
module.exports = class search{


  /**
   * constructor - Creates an instace with the given arguments
   *
   * @param  {string} field   field to filter.
   * @param  {string} value   value is the actual value to match in the filter. Must be defined.
   * @param  {string} valueType the expected value type (i.e. array, string)
   * @param  {string} operator operator used to perform the filter. Must be defined.
   * @param  {object} search  recursive search instance.
   * @return {object}          instace of search class.
   */
  constructor({field, value, valueType, operator, search}){
    this.field = field;
    this.value = this.constructor.parseValue(value, valueType);
    this.operator = operator;
    this.search = search
  }


  /**
   * @static parseValue - Creates the proper type(either array or string) of the value that user wants to filter.
   *
   * @param  {object} val value object to parse.
   * @return {(array|string|number)}     Parsed value
   */
  static parseValue(val, type){
    if(val !== undefined)
    {
      if(type === "Array")
      {
        return val.split(",");
      }else{
        return val;
      }
    }
  }


  /**
   * toSequelize - Convert recursive search instance to search object that sequelize will accept as input.
   *
   * @return {object}  Translated search instance into sequelize object format.
   */
  toSequelize(dataModelDefinition){
    let searchsInSequelize = {};

    if((this.operator === undefined || (this.value === undefined && this.search === undefined))){
      //there's no search-operation arguments
      return searchsInSequelize;

    } else if(this.search === undefined && this.field === undefined){
      searchsInSequelize[Op[this.operator]] = this.value;

    } else if(this.search === undefined){
      const strType = ['String', 'Time', 'DateTime', 'Date']
      let arrayType = (dataModelDefinition[this.field]!=undefined && dataModelDefinition[this.field].replace(/\s+/g, '')[0]==='[')
      if ( arrayType && this.operator === 'in'){
        let pattern = null
        if (strType.includes(dataModelDefinition[this.field].replace(/\s+/g, '').slice(1, -1))){
          this.value = '"'+this.value+'"' 
        } 
        pattern = [ '['+this.value+',%', '%,'+this.value+',%', '%,'+this.value+']'].map((item) => {
            return {[Op.like] : item};
          }); 
        pattern.push({[Op.eq] : '['+this.value+']'})       
        searchsInSequelize[this.field] = {
          [Op.or] : pattern
        };
      } else if (arrayType && this.operator === 'notIn'){
        let pattern = null
        if (strType.includes(dataModelDefinition[this.field].replace(/\s+/g, '').slice(1, -1))){
          this.value = '"'+this.value+'"' 
        } 
        pattern = [ '['+this.value+',%', '%,'+this.value+',%', '%,'+this.value+']'].map((item) => {
          return {[Op.notLike] : item};
        }); 
        pattern.push({[Op.ne] : '['+this.value+']'})
        searchsInSequelize[this.field] = {
          [Op.and] : pattern
        };
      } else {
        searchsInSequelize[this.field] = {
          [Op[this.operator]] : this.value
        };
      }

    }else if(this.field === undefined){
      searchsInSequelize[Op[this.operator]] = this.search.map(sa => {
        let new_sa = new search(sa);
        return new_sa.toSequelize(dataModelDefinition);
      });

    }else{
       searchsInSequelize[this.field] = {
         [Op[this.operator]] : this.search.map(sa => {
           let new_sa = new search(sa);
           return new_sa.toSequelize(dataModelDefinition);
         })
       }
    }

    return searchsInSequelize;
  }
};
