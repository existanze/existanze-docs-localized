var _ = require('lodash');
var async = require('async');
var util = require('util');
var u = require('./utils');

module.exports = function (module) {

  var _this = this;

  _this.defaultLocale = module.defaultLocale;
  _this.locales = module.locales;
  _this.localized = module.localized;

  return {

    construct: function (self, options) {


      self.addFilter('localize', {
          after: function (results, callback) {

            var req = self.get('req');

            var log =false;

            if (log) console.log("cursor.js - -------- LOCALIZED Started ---------");

            if (!req.locale) {
              if (log) console.log("cursor.js -No locale on localize ignoring ");
              if (log) console.log("cursor.js - -------- LOCALIZED END ---------\n\n\n");
              return setImmediate(callback);
            }

            var o = {
              defaultLocale: _this.defaultLocale,
              locales: _this.locales
            };
            if (!o.locale ) {
              o.locale = req.session.locale ? req.session.locale : _this.defaultLocale;
            }

            if (!o.locale) {
              o.locale = req.locale;
            }




            if (log) console.log("cursor.js -**********");
            if (log) console.log("cursor.js -  Options  ", o);
            if (log) console.log("cursor.js -**********");


            _.each(results, function (doc) {



             log = false;

              if(log)console.log("before ensure doc ",JSON.stringify(doc.localized));

              u.ensureProperties(doc, o);

              if(log)console.log("after ensure doc ",JSON.stringify(doc.localized));


              _.each(doc, function (value, key) {

                if (!u.isArea(value)) {
                  if (log) console.log("cursor.js - \t\t\t ", key, "is not an area ");
                  return;
                }
                if (u.isUniversal(doc, key, options)) {
                  return;
                }

                // for bc with sites that didn't have this module until
                // this moment, if the default locale has no content,
                // populate it from the live property
                if (!_.has(doc.localized[o.defaultLocale], key)) {
                  doc.localized[o.defaultLocale][key] = doc[key];
                }

                if (!_.has(doc.localized[o.locale], key)) {
                  if(log) console.log("returning because ",o.locale," is not available for ",key, doc.localized[o.locale]);
                  return;
                }

                if (log) console.log("Doc key \n\t", key);
                // do a shallow clone so the slug property can differ
                // we have to be careful with the dot path
                doc[key] = _.clone(doc.localized[o.locale][key]);
                doc[key]["_dotPath"] = key; // this seems to be causing the issue in the frontend


                if (log) console.log("\nafter\n\n\t", doc[key]);

                if (log)  console.log("cursor.js -  Setting", key, " to ", o.locale, " content ");
                if (log)  console.log("cursor.js -\t\t ", JSON.stringify(doc[key]))

              });

              _.each(_this.localized, function (name) {


                name = u.localizeForPage(doc, name);



                if (!name) {
                  return;
                }


                // for bc with sites that didn't have this module until
                // this moment, if the default locale has no content,
                // populate it from the live property
                if (!_.has(doc.localized[o.defaultLocale], name)) {
                  doc.localized[o.defaultLocale][name] = doc[name];
                }


                if (!_.has(doc.localized[o.locale], name)) {
                  return;
                }

                doc[name] = doc.localized[o.locale][name];


              });

            });


            if (log)console.log("cursor.js - -------- LOCALIZED END ---------\n\n\n");

            return setImmediate(callback);
          }
        }
      );


    }
  }

}
;
