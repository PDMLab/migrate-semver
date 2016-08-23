'use strict';
let db;
const migrationSemVerOptions = {};

const ensureMigrationsTable = function (continueWith) {
  const abortWith = continueWith;

  db.hasMigrationsTable({}, (err, hasMigrationsTable) => {
    if (err) {
      return abortWith(err);
    }
    if (!hasMigrationsTable) {
      db.createMigrationsTable({ name: migrationSemVerOptions.migrationsTableName }, errCreateMigrationsTable => {
        if (errCreateMigrationsTable) {
          return abortWith(errCreateMigrationsTable);
        }

        return continueWith();
      });
    }
  });
};

/**
 *
 * @param {Object} options
 * @param {String} options.version
 * @param {String} options.direction
 * @param continueWith
 */
const hasMigration = function (options, continueWith) {
  db.hasMigration({ version: options.version, direction: options.direction }, (err, hasMigrationApplied) => {
    continueWith(err, hasMigrationApplied);
  });
};

/**
 * @param {Object} options
 * @param {String} options.version
 * @param {String} options.direction
 * @param continueWith
 */
const applyMigration = function (options, continueWith) {
  const abortWith = continueWith;

  const migrationDone = function (err) {
    if (err) {
      return abortWith(err);
    }
    db.addMigrationToMigrationsTable({
      version: options.version,
      direction: options.direction
    }, errAddMigrationToTable => {
      if (errAddMigrationToTable) {
        return abortWith(errAddMigrationToTable);
      }

      return continueWith();
    });
  };

  switch (options.direction) {
    case 'up' : {
      db.up({
        version: options.version,
        migrationsDirectory: migrationSemVerOptions.migrationsDirectory
      }, migrationDone);
      break;
    }
    default: {
      abortWith(new Error());
    }
  }
};

/**
 *
 * @param {Object} options
 * @param {String} [options.migrationsTableName]
 * @param {String} [options.migrationsDirectory]
 * @param {function} plugin
 * @constructor
 */
const MigrateSemVer = function (options, plugin) {
  db = plugin;
  migrationSemVerOptions.migrationsDirectory = options.migrationsDirectory;
  migrationSemVerOptions.migrationsTableName = options.migrationsTableName || 'migrations';
};

MigrateSemVer.prototype.connect = function (options, continueWith) {
  db.connect(options, continueWith);
};

MigrateSemVer.prototype.hasMigrationsTable = function (options, continueWith) {
  db.hasMigrationsTable(options, continueWith);
};

/**
 *
 * @param {Object} options
 * @param {String} options.version
 * @param continueWith
 */
MigrateSemVer.prototype.up = function (options, continueWith) {
  const abortWith = continueWith;
  const migrationOptions = {
    version: options.version,
    direction: 'up'
  };

  ensureMigrationsTable(err => {
    if (err) {
      return abortWith(err);
    }
    hasMigration(migrationOptions, (errHasMigration, hasMigrationApplied) => {
      if (errHasMigration) {
        abortWith(errHasMigration);
      }
      if (!hasMigrationApplied) {
        applyMigration(migrationOptions, errApplyMigration => {
          if (errApplyMigration) {
            return abortWith(errApplyMigration);
          }

          return continueWith();
        });
      }
    });
  });
};

module.exports = MigrateSemVer;
