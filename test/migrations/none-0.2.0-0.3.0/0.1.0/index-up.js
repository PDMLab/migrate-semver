'use strict';

const up = function (tables, continueWith) {
  tables.push({});
  tables.push({});
  tables.push({});
  continueWith();
};

module.exports = {
  up
};
