'use strict';
const _ = require('lodash');
const assert = require('assert');
const compareVersions = require('compare-versions');
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

  const getLatestAppliedMigration = function (continueWith) {
    const sortedVersions = migrations.map(migration => migration.version).sort(compareVersions);
    const latestMigration = sortedVersions[sortedVersions.length - 1];

    return continueWith(null, latestMigration);
  };

  const addMigrationToMigrationsTable = function (options, continueWith) {
    migrations.push({
      version: options.version,
      direction: options.direction
    });
    continueWith();
  };

  const up = function (options, continueWith) {
    let numberOfTables;

    if (options.customOptions) {
      numberOfTables = options.customOptions.numberOfTables;
    }
    const migrationsDirectory = options.migrationsDirectory;
    const migrationPath = path.join(migrationsDirectory, options.version, 'index-up');
    const migration = require(migrationPath); // eslint-disable-line

    if (numberOfTables) {
      migration.up(tables, numberOfTables, continueWith);
    } else {
      migration.up(tables, continueWith);
    }
  };

  return {
    connect,
    hasMigrationsTable,
    createMigrationsTable,
    hasMigration,
    getLatestAppliedMigration,
    addMigrationToMigrationsTable,
    up
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

  describe('When asking whether migration can be done (migration folder + file exist)', () => {
    beforeEach(done => {
      done();
    });

    describe('When migration folder does not exist', () => {
      it('should return false', done => {
        const version = '0.1.0';
        const migrationsDirectory = path.join(__dirname, 'migrations');
        const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

        migrateSemVer.connect({}, err => { // eslint-disable-line
          migrateSemVer.canMigrate({ version }, (err, canMigrate) => { // eslint-disable-line
            assert.equal(canMigrate, false);
            done();
          });
        });
      });
    });

    describe('When migration folder exists without migration file', () => {
      it('should return false', done => {
        const version = '0.1.0';
        const migrationsDirectory = path.join(__dirname, 'migrations', 'empty');
        const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

        migrateSemVer.connect({}, err => { // eslint-disable-line
          migrateSemVer.canMigrate({ version }, (err, canMigrate) => { // eslint-disable-line
            assert.equal(canMigrate, false);
            done();
          });
        });
      });
    });

    describe('When migration folder exists with migration file', () => {
      it('should return true', done => {
        const version = '0.1.0';
        const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
        const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

        migrateSemVer.connect({}, err => { // eslint-disable-line
          migrateSemVer.canMigrate({ version }, (err, canMigrate) => { // eslint-disable-line
            assert.equal(canMigrate, true);
            done();
          });
        });
      });
    });

    describe('When migration folder exists with migration file and ENV INIT_VERSION === available migration' , () => {
      it('should return false', done => {
        const version = '0.1.0';
        process.env.INIT_VERSION = '0.1.0';
        const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
        const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

        migrateSemVer.connect({}, err => { // eslint-disable-line
          migrateSemVer.canMigrate({ version }, (err, canMigrate) => { // eslint-disable-line
            assert.equal(canMigrate, false);
            done();
          });
        });
      });
    });

    describe('When migration folder exists with migration file and ENV INIT_VERSION !== available migration' , () => {
      it('should return false', done => {
        const version = '0.1.0';
        process.env.INIT_VERSION = '0.0.1';
        const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
        const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

        migrateSemVer.connect({}, err => { // eslint-disable-line
          migrateSemVer.canMigrate({ version }, (err, canMigrate) => { // eslint-disable-line
            assert.equal(canMigrate, true);
            done();
          });
        });
      });
    });

    describe('When migration folder exists with migration file and ENV INIT_VERSION not set' , () => {
      it('should return false', done => {
        const version = '0.1.0';
        const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
        const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

        migrateSemVer.connect({}, err => { // eslint-disable-line
          migrateSemVer.canMigrate({ version }, (err, canMigrate) => { // eslint-disable-line
            assert.equal(canMigrate, true);
            done();
          });
        });
      });
    });
  });

  describe('When running migration from no tables to 0.1.0 with no migrations table existing', () => {
    it('should contain migration in migrations table', done => {
      const version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.hasMigration({ version, direction: 'up' }, (err, hasMigration) => { // eslint-disable-line
          assert.equal(hasMigration, false);
          migrateSemVer.up({ version, customOptions: { numberOfTables: 3 } }, err => { // eslint-disable-line
            assert.equal(migrations[0].version, version);
            migrateSemVer.hasMigration({ version, direction: 'up' }, (err, hasMigrationAfterRun) => { // eslint-disable-line
              assert.equal(hasMigrationAfterRun, true);
              done();
            });
          });
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

  describe('When running migration from no tables to 0.2.0 with no migrations table existing', () => {
    it('should contain 2 migrations in migrations table', done => {
      const version = '0.2.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.2.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(migrations[0].version, '0.1.0');
          assert.equal(migrations[1].version, version);
          done();
        });
      });
    });

    it('should create 4 tables in database', done => {
      const version = '0.2.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.2.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(tables.length, 4);
          done();
        });
      });
    });
  });

  describe('When running migration from existing migration table from 0.1.0 to 0.2.0', () => {
    it('should contain 2 migrations in migrations table', done => {
      let version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0-0.2.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(migrations[0].version, version);
          version = '0.2.0';
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(migrations[1].version, version);
            done();
          });
        });
      });
    });

    it('should create 4 tables in database', done => {
      let version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0-0.2.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          version = '0.2.0';
          assert.equal(tables.length, 3);
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(tables.length, 4);
            done();
          });
        });
      });
    });
  });

  describe('When running migration from existing migration table from 0.1.0 to 0.3.0', () => {
    it('should contain 3 migrations in migrations table', done => {
      let version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0-0.3.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(migrations[0].version, version);
          version = '0.3.0';
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(migrations[2].version, version);
            done();
          });
        });
      });
    });

    it('should create 5 tables in database', done => {
      let version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0-0.3.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          version = '0.3.0';
          assert.equal(tables.length, 3);
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(tables.length, 5);
            done();
          });
        });
      });
    });
  });

  describe('When running migration from existing migration table from 0.2.0 to 0.3.0', () => {
    it('should contain 3 migrations in migrations table', done => {
      let version = '0.2.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.2.0-0.3.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(migrations[1].version, version);
          version = '0.3.0';
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(migrations[2].version, version);
            done();
          });
        });
      });
    });

    it('should create 5 tables in database', done => {
      let version = '0.2.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.2.0-0.3.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          version = '0.3.0';
          assert.equal(tables.length, 4);
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(tables.length, 5);
            done();
          });
        });
      });
    });
  });

  describe('When running migration from existing migration table from 0.1.0 trough 0.2.0 to 0.3.0', () => {
    it('should contain 3 migrations in migrations table', done => {
      let version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.1.0-0.2.0-0.3.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(migrations[0].version, version);
          version = '0.2.0';
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(migrations[1].version, version);
            version = '0.3.0';
            migrateSemVer.up({ version }, err => { // eslint-disable-line
              assert.equal(migrations[2].version, version);
              done();
            });
          });
        });
      });
    });

    it('should create 5 tables in database', done => {
      let version = '0.1.0';
      const migrationsDirectory = path.join(__dirname, 'migrations', 'none-0.2.0-0.3.0');
      const migrateSemVer = new SemVerMigration({ migrationsDirectory }, fakePlugin());

      migrateSemVer.connect({}, err => { // eslint-disable-line
        migrateSemVer.up({ version }, err => { // eslint-disable-line
          assert.equal(tables.length, 3);
          version = '0.2.0';
          migrateSemVer.up({ version }, err => { // eslint-disable-line
            assert.equal(tables.length, 4);
            version = '0.3.0';
            migrateSemVer.up({ version }, err => { // eslint-disable-line
              assert.equal(tables.length, 5);
              done();
            });
          });
        });
      });
    });
  });
});
