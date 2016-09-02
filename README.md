# Database agnostic migrations based on SemVer using Node.js

`migrate-semver` is a small library to allow you do to migrations based on [SemVer](http://semver.org/) in a database agnostic way using Node.js.

## Installation

```
npm install --save migrate-semver
```

## Usage

`migrate-semver` just handles the heavy lifting of finding the viable migrations to run based on a SemVer compliant version string passed into it.

The following example runs a migration for version `0.3.0`.

```js
const version = '0.3.0';
const migrationsDirectory = path.join(__dirname, 'migrations');
const migrateSemVer = new SemVerMigration({ migrationsDirectory }, plugin());

migrateSemVer.connect({}, err => {
  migrateSemVer.up({ version }, err => {
    assert.equal(migrations[2].version, version);
    done();
  });
});
```

`migrate-semver` handles several scenarios for you based on the example above: 

* If your current database has no migrations at all (so it might be empty at all), `migrate-semver` runs all available migrations until `0.3.0` (including `0.3.0`).
* If your current database has version `0.2.0` applied and `0.3.0` is the next available migration, `0.3.0` is just applied.
* If your current database has version `0.1.0` applied and `0.2.0` is also available, both `0.2.0` and `0.3.0` wil be applied.

`migrate-semver` allows you to specify the base directory which contains all your migration folders and files.
Just pass the `migrationsDirectory` option to the `SemVerMigration` ctor function as shown above.

The file and folder structure has to follow this convention (the `index-up.js` can be renamed if you implement your own plugin):

<pre>
- &lt;migrationsDirectory>    
  - 0.1.0
    - index-up.js
  - 0.2.0
    - index-up.js
  - 0.2.1
    - index-up.js
  - 0.3.0 
    - index-up.js
</pre>

### canMigrate

If you want to automate your migrations, your code triggering the migrations can check whether an migration for a particular version can be done using the `migrateSemVer.canMigrate({ version })` function:

```js
const version = '0.3.0';

migrateSemVer.connect({}, err => {
  migrateSemVer.canMigrate({ version }, (err, canMigrate) => {
    if (canMigrate) {
      migrateSemVer.up({ version }, err => {
        assert.equal(migrations[2].version, version);
        done();
      });
    }
  });
});
```

If you don't do this sane check and the migration file or directory won't exist, you'll receive an error during when trying to run the migration.
 
### customOptions

You can pass custom options to the `up` function as child object of the `options` parameter.
These `customOptions` will be passed into the plugin and if the plugin handles them appropriately, they'll be passed into every migration (the 'how' depends on the particular plugin).
 
```js
migrateSemVer.up({ version, customOptions }, err => {
  assert.equal(migrations[2].version, version);
  done();
});
```

## Plugins

As said, `migrate-semver` is database agnostic, so the concrete implementation for a particular database has to be done by a plugin which has to be passed to the `SemVerMigration` ctor function as well.

Currently there is one plugin implementation available for MongoDb using `mongoose`.

For more details on `migrate-semver-mongoose` visit the [GitHub-Repository](https://github.com/PDMLab/migrate-semver-mongoose).

If you want to implement your own `migrate-semver` plugin, just implement a Node.js module exporting the following functions:

```js
const plugin = function(options, callback) {

  const hasMigrationsTable = function (options, callback) {
    callback(null, hasTable);
  };

  const createMigrationsTable = function (options, callback) {
    callback();
  };

  /**
  * @param {Object} options
  * @param {String} options.version
  * @param {String} options.direction - may be up or down
  */
  const hasMigration = function (options, callback) {
    callback(null, hasMigrationApplied);
  };

  const getLatestAppliedMigration = function (callback) {
    return callback(null, latestMigration); // e.g. '0.2.0'
  };

  /**
  * @param {Object} options
  * @param {String} options.version
  * @param {String} options.direction - may be up or down
  */
  const addMigrationToMigrationsTable = function (options, callback) {
    callback();
  };

  /**
  * @param {Object} options
  * @param {String} options.version
  * @param {String} options.migrationsDirectory
  * @param {Object} [options.customOptions]
  */
  const up = function (options, continueWith) {
    const migrationsDirectory = options.migrationsDirectory;
    const migrationPath = path.join(migrationsDirectory, options.version, 'index-up');
    const migration = require(migrationPath); // eslint-disable-line
    migration.up(options, callback);
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
}

module.exports = plugin;
```

After this, just `require` your plugin and pass it to the `SemVerMigration` ctor function.

## Running the tests

```
npm test
```

## Want to help?

This project is just getting off the ground and could use some help with cleaning things up and refactoring.

If you want to contribute - we'd love it! Just open an issue to work against so you get full credit for your fork. You can open the issue first so we can discuss and you can work your fork as we go along.

If you see a bug, please be so kind as to show how it's failing, and we'll do our best to get it fixed quickly.

Before sending a PR, please [create an issue](https://github.com/PDMLab/composefile/issues/new) to introduce your idea and have a reference for your PR.

Also please add tests and make sure to run `npm run eslint`.

## License

MIT License

Copyright (c) 2016 PDMLab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.