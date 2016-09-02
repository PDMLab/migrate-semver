'use strict';

let howMany = 3;

const up = function (tables, numberOfTables, continueWith) {
  if (numberOfTables && typeof numberOfTables !== 'function') {
    howMany = numberOfTables;
  } else {
    continueWith = numberOfTables;
  }
  for (let i = 1; i <= howMany; i++) {
    tables.push({});
  }
  continueWith();
};

module.exports = {
  up
};
