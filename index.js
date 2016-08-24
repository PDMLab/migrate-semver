'use strict';
const _ = require('lodash');
const async = require('async');
const compareVersions = require('compare-versions');
const fs = require('fs');
const path = require('path');
let db;
const migrationSemVerOptions = {};

const ensureMigrationsTable = function (continueWith) {
  const abortWith = continueWith;

  db.hasMigrationsTable({}, (err, hasMigrationsTable) => {
    if (err) {
      return abortWith(err);
    }
    if (!hasMigrationsTable) {
      db.createMigrationsTable({}, errCreateMigrationsTable => {
        if (errCreateMigrationsTable) {
          return abortWith(errCreateMigrationsTable);
        }

        return continueWith();
      });
    } else {
      continueWith();
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
 * @param {String} [options.migrationsDirectory]
 * @param {Object} plugin
 * @constructor
 */
const MigrateSemVer = function (options, plugin) {
  db = plugin;
  migrationSemVerOptions.migrationsDirectory = options.migrationsDirectory;
};

MigrateSemVer.prototype.connect = function (options, continueWith) {
  db.connect(options, continueWith);
};

const getAvailableMigrationsOrdered = function (continueWith) {
  const abortWith = continueWith;
  const availableMigrations = [];

  fs.readdir(migrationSemVerOptions.migrationsDirectory, (err, directoryEntries) => {
    if (err) {
      return abortWith(err);
    }
    async.forEachOfSeries(directoryEntries, (entry, key, done) => {
      const pathOfEntry = path.join(migrationSemVerOptions.migrationsDirectory, entry);

      fs.stat(pathOfEntry, (errStat, stats) => {
        if (errStat) {
          return abortWith(errStat);
        }
        if (stats.isDirectory()) {
          availableMigrations.push(entry);

          return done();
        }

        return done();
      });
    }, errIteration => {
      if (errIteration) {
        abortWith(errIteration);
      }
      const availableMigrationsOrdered = availableMigrations.sort(compareVersions);

      return continueWith(null, availableMigrationsOrdered);
    });
  });
};

const getLatestAppliedMigration = function (continueWith) {
  const abortWith = continueWith;

  db.getLatestAppliedMigration((err, latestAppliedMigration) => {
    if (err) {
      return abortWith(err);
    }

    return continueWith(null, latestAppliedMigration);
  });
};

/**
 * @param {Object} options
 * @param {String} options.version
 * @param {String} options.direction
 * @param continueWith
 */
const getUnAppliedMigrations = function (options, continueWith) {
  const abortWith = continueWith;

  async.parallel([
    awaits => {
      getAvailableMigrationsOrdered((err, availableMigrations) => awaits(err, availableMigrations));
    },
    awaits => {
      getLatestAppliedMigration((err, latestAppliedMigration) => awaits(err, latestAppliedMigration));
    }
  ], (err, results) => {
    if (err) {
      return abortWith(err);
    }

    const desiredVersion = options.version;
    const availableMigrations = results[0];
    const latestApplied = results[1];
    const viableMigrations = _.filter(availableMigrations, migration => {
      if (compareVersions(desiredVersion, migration) >= 0) {
        if (typeof latestApplied === 'undefined') {
          return migration;
        }
        if (compareVersions(latestApplied, migration) === -1) {
          return migration;
        }
      }
    });

    return continueWith(null, viableMigrations.sort(compareVersions));
  });
};

/**
 * @param {Object} options
 * @param {Array<String>} options.migrations
 * @param continueWith
 */
const applyMigrations = function (options, continueWith) {
  const abortWith = continueWith;
  const unAppliedMigrations = options.migrations;

  async.forEachOfSeries(unAppliedMigrations, (migration, key, done) => {
    applyMigration({ version: migration, direction: 'up' }, errApplyMigration => {
      if (errApplyMigration) {
        return abortWith(errApplyMigration);
      }

      return done();
    });
  }, errIteration => {
    if (errIteration) {
      return abortWith(errIteration);
    }

    return continueWith();
  });
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
        getUnAppliedMigrations(migrationOptions, (errUnAppliedMigrations, unAppliedMigrations) => {
          if (errUnAppliedMigrations) {
            return abortWith(errUnAppliedMigrations);
          }
          if (unAppliedMigrations.length === 0) {
            applyMigration(migrationOptions, errApplyMigration => {
              if (errApplyMigration) {
                return abortWith(errApplyMigration);
              }

              return continueWith();
            });
          } else {
            applyMigrations({ migrations: unAppliedMigrations }, errApplyMigrations => {
              if (errApplyMigrations) {
                return abortWith(errApplyMigrations);
              }

              return continueWith();
            });
          }
        });
      } else {
        continueWith();
      }
    });
  });
};

module.exports = MigrateSemVer;
