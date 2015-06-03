/*
 SPARQL Lab glue code

 derived from an example at https://gist.github.com/LaurensRietveld/eebde750f87c52cdfa58
 */

"use strict";

var $ = require('jquery');
var YASQE = require('./yasqe.bundled.min.js');
var YASR = require('./yasr.bundled.min.js');
var SparqlParser = require('sparqljs').Parser;
var parser = new SparqlParser();
var SparqlGenerator = require('sparqljs').Generator;
var generator = new SparqlGenerator();

var consumeUrl = function(yasqe, args) {
  // change endpoint value if there is any
  if (args.endpoint) {
    yasqe.options.sparql.endpoint = args.endpoint;
  } else {
    yasqe.options.sparql.endpoint = "http://zbw.eu/beta/sparql/stwv/query";
  }
  // display the endpoint url on the page
  document.getElementById("endpoint_url").innerHTML = yasqe.options.sparql.endpoint;
  if (args.hide && args.hide != 0) {
    document.getElementById("yasqe").style.display = "none";
    document.getElementById("results").style.display = "none";
    document.getElementById("results-link").style.display = "none";
    //YASR.defaults.drawOutputSelector = false;
  }

  //want to consume other arguments such as the request type (POST/GET), or arguments to send to endpoint
  //feel free to add them in this function as well.
  //as you see, all options you can specify in the default settings, are configurable via yasqe.options as well

  // change query value if provided in URL
  // (takes precedence over queryref)
  if (args.query) {
    yasqe.setValue(args.query);
    yasqe.query();
  }
  //Or, if you want to configure yasqe via a remote url (e.g. a query in some file elsewhere),
  //feel free to do so!
  //This example uses a cors proxy to access a github file containing a query
  else if (args.queryRef) {

    // display query reference
    var re = new RegExp("https://api.github.com/repos/(.*?)/contents/(.*)");
    var query_uri = args.queryRef;
    var found = query_uri.match(re);
    document.getElementById("repo").innerHTML = found[1];
    document.getElementById("query_reference").innerHTML = found[2];
    if (document.getElementById("sub_title")) {
      document.getElementById("sub_title").innerHTML = found[2];
    }
    document.title = found[2] + ' | SPARQL Lab';

    // get the query and execute
    $.get(args.queryRef, function(data) {
      var query = atob(data.content);
      // q+d versionHistorySet value replacement (must be first value parameter)
      var re;
      var parsedQuery = parser.parse(query);
      var vals = parsedQuery.where[0].values[0];
      for (var param in args) {
        // if the variable is found in the template
        if (Object.keys(vals).indexOf('?'+param) !== -1) {
          // "" wrapping all variables that were either undefined or literals in the template
          if (vals['?'+param] === undefined || vals['?'+param].charAt(0) === '"')
            vals['?'+param] = '"' + args[param] + '"';
          else
            vals['?'+param] = args[param];
        }
      }
      query = generator.stringify(parsedQuery);
      yasqe.setValue(query);
      yasqe.query();
    });
  }
};
 
var yasqe = YASQE(document.getElementById("yasqe"), {
  // display full query
  viewportMargin: Infinity,
  // grey edit window during query execution
  backdrop : 99,
  // modify codemirror tab handling to solely use 2 spaces
  tabSize: 2,
  indentUnit: 2,
  extraKeys: {
    Tab: function(cm) {
      var spaces = new Array(cm.getOption("indentUnit") + 1).join(" ");
      cm.replaceSelection(spaces);
    }
  },
  sparql: {
    showQueryButton: true
  },
  consumeShareLink: consumeUrl
});

// merge fitting labels into uris, don't try to fetch from preflabel.org
YASR.plugins.table.defaults.mergeLabelsWithUris = true;
YASR.plugins.table.defaults.fetchTitlesFromPreflabel = false;
YASR.plugins.table.defaults.datatable.pageLength = 50;
YASR.plugins.pivot.defaults.mergeLabelsWithUris = true;
// don't load google content (protect privacy)
YASR.plugins.pivot.defaults.useGoogleCharts = false;
// disable persistency
YASR.defaults.persistency.prefix = false;

var yasr = YASR(document.getElementById("yasr"), {
  //this way, the URLs in the results are prettified using the defined prefixes in the query
  getUsedPrefixes: yasqe.getPrefixesFromQuery,
  useGoogleCharts: false
});
 
// link yasqe and yasr together
yasqe.options.sparql.callbacks.complete = function() {
  yasr.setResponse.apply(this, arguments);
  document.getElementById('results').scrollIntoView()
}
