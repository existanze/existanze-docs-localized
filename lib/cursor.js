module.exports = function (module,localized) {

  return {

    construct: function (self, options) {

      self.addFilter('localize', {
          after: function (results, callback) {

            var req = self.get('req');

            if (!req.locale) {
              return setImmediate(callback);
            }

            var locale = req.session.locale ? req.session.locale : module.defaultLocale;

            if (!locale) {
              locale = req.locale;
            }

            return localized.loadLocale(results,locale,callback);

          }
        }
      );
    }
  }

};
