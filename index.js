var _ = require('lodash');
var async = require('async');
var util = require("util");
var u = require("./lib/utils");

module.exports = {
  improve: 'apostrophe-docs',
  afterConstruct:function(self){


    self.apos.app.use(self.localizedHelper);
    self.apos.app.use(self.localizedGet);


  },
  construct:function(self,options){



    self.defaultLocale = options.default || "en";
    self.locales = options.locales;
    self.localized = [ 'title' ].concat(options.localized || []);


    self.setLocale = function(req,locale){

      var set = locale;

      if(!set){
        set = req.session.locale;
      }


      if(!set){
        set = self.defaultLocale;
      }

      req.locale = set;
      req.session.locale = set;
      req.data.activeLocale = set;
      self.apos.i18n.setLocale(req,set);


    };

    self.localizedHelper=function(req, res, next) {
      self.addHelpers({

        localePicker:function(args){


          var locales = [];
          var availableLanguages = _.keys(locales);

          var urls = require('url');
          var parsed = urls.parse(req.url, true);
          delete parsed.search;
          delete parsed.query.apos_refresh;
          var currentUrl = urls.format(parsed);



          if (args && args.localized && args._edit == undefined) {
            availableLanguages = _.keys(args.localized);
          }

          _.each(options.locales, function (value, key) {


            var newUrl = '/' + key + currentUrl;

            /**
             * We don't want to include a locale
             * slug for defaultLocale
             */
            if(key == self.defaultLocale){
              newUrl = currentUrl;
            }

            var localeObject = {
              key: key,
              value: value,
              url: newUrl,
              translated: (_.indexOf(availableLanguages, key) >=0) ,
              active: (req.locale === key)
            };

            locales.push(localeObject);

          });

          return self.partial('localePicker', {locales: locales, args: args});

        }
      });

      return next();

    };

    self.localizedGet=function(req, res, next) {
      if (req.method !== 'GET') {
        return next();
      }

      var matches = req.url.match(/^\/(\w+)(\/.*|\?.*|)$/);
      if (!matches) {
        //do not keep the session locale here
        self.setLocale(req,self.defaultLocale);
        return next();
      }

      if (!_.has(options.locales, matches[1])) {
        self.setLocale(req,self.defaultLocale);
        return next();
      }

      self.setLocale(req,matches[1]);

      req.url = matches[2];

      if (!req.url.length) {
        req.url = "/"
      }

      return next();

    };

    self.docBeforeSave = function(req, doc, options) {

      //TODO check why req.locale is always en
      // using req.session.locale as a fallback
      var locale = req.locale;
      if(req.session && req.session.locale){
        locale = req.session.locale;
      }

      if(!locale){
        locale = self.defaultLocale;
      }


      if(!locale){
        return;
      }




      u.ensureProperties(doc,{
        "defaultLocale": self.defaultLocale,
        "locale": locale,
        "locales":options.locales
      });

      var before = JSON.stringify(doc.localized[locale] || {});

      _.each(doc, function(value, key) {


        if (!u.isArea(value)) {
          return;
        }

        if (u.isUniversal(doc, key,self.options)) {
          return;
        }


        doc.localized[locale][key] = value;

        // Revert .body to the default culture's body, unless
        // that doesn't exist yet, in which case we let it spawn from
        // the current culture
        if (_.has(doc.localized[self.defaultLocale], key)) {
          doc[key] = doc.localized[self.defaultLocale][key];
        } else {
          doc.localized[self.defaultLocale][key] = doc[key];

        }



      });


      _.each(self.localized,function(name){

        name = u.localizeForPage(doc,name);

        if(!name){
          return;
        }

        if(u.isArea(doc[name])){
          return;
        }



        doc.localized[locale][name] = doc[name];

        if (_.has(doc.localized[self.defaultLocale], name)) {
          doc[name] = doc.localized[self.defaultLocale][name];
        } else {
          doc.localized[self.defaultLocale][name] = doc[name];
        }

      });


      /**
       * TODO This sometimes causes circular reference problems
       * we need to check how else to do it
       */
      var after = JSON.stringify(doc.localized[locale] || {});

      if (before !== after) {
        doc.localizedAt[locale] = new Date();
        if (locale === self.default) {
          doc.localizedStale = _.without(_.keys(self.locales), self.defaultLocale);
        } else {
          // modifies in place
          _.pull(doc.localizedStale, locale);
        }
      }

    };



    /**
     * Go over all schemas and set the _localized value so that
     * we can augment the apostrophe-schema:macros in order
     * to display a localization icon
     *
     */
    _.each(self.apos.modules,function(module){

      var moduleName =

        module.options.alias ?
          module.options.alias : module.__meta.name;


      if(module.schema){
        _.each(module.schema,function(field){

          if(
            field.type == "area" ||
            self.localized.indexOf(field.name) >= 0 ||
            self.localized.indexOf(moduleName+":"+field.name) >=0 ){
            field._localized = true;

          }
        })
      }

    });



    // merge new methods with all apostrophe-cursors
    self.apos.define('apostrophe-cursor', require('./lib/cursor.js')({
      defaultLocale : self.defaultLocale,
      locales : self.locales,
      localized : self.localized
    }));
  }


};