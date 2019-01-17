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
    var Role = sequelize.define('role', {

        name: {
            type: Sequelize.STRING,
            unique: true
        },
        description: {
            type: Sequelize.STRING
        }
    });

    Role.associate = function(models) {
        Role.belongsToMany(models.user, {
            through: 'role_to_user',
            onDelete: 'CASCADE'
        });
    };

    return Role;
};
