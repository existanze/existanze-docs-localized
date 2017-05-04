var _ = require("lodash");

module.exports = {

  isUniversal: function (page, key, options) {

    if (_.has(options.universal || [], key) || _.has(options.universal || [], page.type + ':' + key)) {
      return;
    }
  },

  isArea: function (value) {
    return !((!value) || (value.type !== 'area'));
  },

  ensureProperties: function (page, options) {

    var o = _.extend({
      "defaultLocale": "en",
      "locale": "en",
      "locales": ["en"]
    }, options);

    var log = false;



    if(log) console.log("Cursor - ensureProperties ", page.slug);

    if (!_.has(page, 'localized')) {
      if(log) console.log("\t\t doesn't have localized");
      page.localized = {};
    }
    if (!_.has(page, 'localizedAt')) {
      if(log) console.log("\t\t doesn't have localizedAt");
      page.localizedAt = {};
    }
    if (!_.has(page, 'localizedStale')) {
      if(log) console.log("\t\t doesn't have localizedStale");
      page.localizedStale = [];
    }
    page.localizedSeen = _.union(page.localizedSeen || [], o.locales);
    if(log) console.log("\t\t setting localizedSeen ", o.locales);


    if (!_.has(page.localized, o.locale)) {
      if(log) console.log("\t\t doesn't have localized key ", o.locale);
      page.localized[o.locale] = {};
    }
    if (!_.has(page.localized, defaultLocale)) {
      if(log) console.log("\t\t doesn't have localized key ", o.defaultLocale);
      page.localized[o.defaultLocale] = {};
    }
  },
  localizeForPage:function(page,name){

    var matches = name.match(/([\w-]+):(\w+)/);

    if (matches) {
      if (page.type !== matches[1]) {
        return;
      }
      name = matches[2];
    }
    if (!_.has(page, name)) {
      return;
    }


    return name;

  }


};