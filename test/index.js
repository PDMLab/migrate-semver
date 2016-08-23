'use strict';
const _ = require('lodash');
const assert = require('assert');
const SemVerMigration = require('../');
const path = require('path');

let migrations;
let tables = [];

const fakePlugin = function () {
  const connect = function (options, continueWith) {
    continueWith();
  };
  const hasMigrationsTable = function (options, continueWith) {
    continueWith(null, typeof migrations !== 'undefined');
  };

  const createMigrationsTable = function (options, continueWith) {
    migrations = [];
    continueWith();
  };

  const hasMigration = function (options, continueWith) {
    const hasMigrationApplied =
      _.some(migrations, migration => migration.version === options.version && migration.direction === options.direction);

    continueWith(null, hasMigrationApplied);
  };

  const addMigrationToMigrationsTable = function (options, continueWith) {
    migrations.push({
      version: options.version,
      direction: options.direction
    });
    continueWith();
  };

  const up = function (options, continueWith) {
    const migrationsDirectory = options.migrationsDirectory;
    const migrationPath = path.join(migrationsDirectory, options.version, 'index-up');
    const migration = require(migrationPath); // eslint-disable-line

    migration.up(tables, continueWith);
  };

  return {
    connect, hasMigrationsTable, createMigrationsTable, hasMigration, addMigrationToMigrationsTable, up
  };
};

describe('Migrations', () => {
  beforeEach(done => {
    migrations = undefined;
    tables = [];
    done();
  });

  describe('When connecting to a db via plugin', () => {
    it('should call connect via plugin', done => {
      const migrateSemVer = new SemVerMigration({}, fakePlugin());

      migrateSemVer.connect({}, err => {
        assert.equal(null, err);
        done();
      });
    });
  });

  describe('When running migration from no tables to 0.1.0 with no migrations table existing', () => {
    it('should contain migration in migrations table', done => {
      const version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(migrations[0].version, version);
          done();
        });
      });
    });

    it('should create 3 tables in database', done => {
      const version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(tables.length, 3);
          done();
        });
      });
    });
  });
});
