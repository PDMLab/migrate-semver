'use strict';

const up = function (tables, continueWith) {
  tables.push({});
  continueWith();
};

module.exports = {
  up
};
