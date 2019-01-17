'use strict';

const Sequelize = require('sequelize');

/**
 * module - Creates a sequelize model
 *
 * @param  {object} sequelize Sequelize instance.
 * @param  {object} DataTypes Allowed sequelize data types.
 * @return {object}           Sequelize model with associations defined
 */
module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define('user', {

        email: {
            type: Sequelize.STRING,
            unique: true
        },
        password: {
            type: Sequelize.STRING
        }
    });

    User.associate = function(models) {
        User.belongsToMany(models.role, {
            through: 'role_to_user',
            onDelete: 'CASCADE'
        });
    };

    return User;
};
