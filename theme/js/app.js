"use strict";
var myApp = angular.module('myApp', [
                    'config',
                    'ngRoute',
                    'ui.bootstrap',
                    'ui.tree',
                    'services',
                    'ui.bootstrap.datetimepicker',
                    'angularMoment',
                    'localytics.directives',
                    'ngInputModified',
                    'ngFormValidation',
                    'ui.select',
                    'ngSanitize',
                    'selectionModel',
                    'ngFileSaver',
                    'cfp.hotkeys',
                    'acute.select',
                    ]);

var HEADER_NAME = 'MyApp-Handle-Errors-Generically';
var specificallyHandleInProgress = false;

myApp.factory('RequestsErrorHandler', ['$q', function($q) {
    return {
        // --- The user's API for claiming responsiblity for requests ---
        specificallyHandled: function(specificallyHandledBlock) {
            specificallyHandleInProgress = true;
            try {
                return specificallyHandledBlock();
            } finally {
                specificallyHandleInProgress = false;
            }
        },
        // --- Response interceptor for handling errors generically ---
        responseError: function(rejection) {
            var shouldHandle = (rejection && rejection.config && rejection.config.headers
                && rejection.config.headers[HEADER_NAME]);

            if (shouldHandle) {
                if (rejection.config.url.indexOf("rights") == -1){
                        if (rejection.status == 403){
                            console.log("Action not allowed for " +
                                            rejection.config.url);
                        }
                        else{
                            var text = "Server error.";
                            var method = rejection.config.method;
                            console.log(method + " error from " +
                                        rejection.config.url);
                            if (method == 'GET'){
                              text = 'Problem getting data.';
                            } else if (method == 'POST'){
                              text = 'Problem posting data.';
                            } else if (method == 'PUT'){
                              text = 'Problem updating data.';
                            } else if (method == 'DELETE'){
                              text = 'Problem deleting data.';
                            }
                            // show an error status message
                            $('#status_message span').text(text);
                            $('#status_message span').addClass('alert-warning');
                            $('#status_message').show();
                            window.setTimeout(function () {
                                $("#status_message").hide();
                                $('#status_message span').removeClass('alert-warning');
                            }, 2000);
                        }
                    }
                else{
                    console.log("Rights error from " +
                            rejection.config.url);
                }
            }

            return $q.reject(rejection);
        }
    };
}]);

myApp.config(['$provide', '$httpProvider', function($provide, $httpProvider) {
    $httpProvider.interceptors.push('RequestsErrorHandler');

    // --- Decorate $http to add a special header by default ---
    function addHeaderToConfig(config) {
        config = config || {};
        config.headers = config.headers || {};
        // Add the header unless user asked to handle errors himself
        if (!specificallyHandleInProgress) {
            config.headers[HEADER_NAME] = true;
        }

        return config;
    }

    // The rest here is mostly boilerplate needed to decorate $http safely
    $provide.decorator('$http', ['$delegate', function($delegate) {
        function decorateRegularCall(method) {
            return function(url, config) {
                return $delegate[method](url, addHeaderToConfig(config));
            };
        }

        function decorateDataCall(method) {
            return function(url, data, config) {
                return $delegate[method](url, data, addHeaderToConfig(config));
            };
        }

        function copyNotOverriddenAttributes(newHttp) {
            for (var attr in $delegate) {
                if (!newHttp.hasOwnProperty(attr)) {
                    if (typeof($delegate[attr]) === 'function') {
                        newHttp[attr] = function() {
                            return $delegate.apply($delegate, arguments);
                        };
                    } else {
                        newHttp[attr] = $delegate[attr];
                    }
                }
            }
        }

        var newHttp = function(config) {
            return $delegate(addHeaderToConfig(config));
        };

        newHttp.get = decorateRegularCall('get');
        newHttp.delete = decorateRegularCall('delete');
        newHttp.head = decorateRegularCall('head');
        newHttp.jsonp = decorateRegularCall('jsonp');
        newHttp.post = decorateDataCall('post');
        newHttp.put = decorateDataCall('put');

        copyNotOverriddenAttributes(newHttp);

        return newHttp;
    }]);
}]);

myApp.config(function(formValidationDecorationsProvider, formValidationErrorsProvider) {
    formValidationDecorationsProvider
    .useBuiltInDecorator('bootstrap')
        .useIconLibrary('fontawesome')
  ;
    formValidationErrorsProvider
        .useBuiltInErrorListRenderer('bootstrap')
    ;
});

myApp.config(['$routeProvider', '$httpProvider',
  function($routeProvider, $httpProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/projects.html',
        controller: 'projectsController'
      }).
      when('/login', {
        templateUrl: 'partials/login.html',
        controller: 'loginController',
        'public': true
      }).
      when('/logout', {
        template: '',
        controller: 'logoutController',
        'public': true
      }).
      when('/projects', {
        templateUrl: 'partials/projects.html',
        controller: 'projectsController'
      }).
      when('/company_information', {
        templateUrl: 'partials/company_information.html',
        controller: 'companyinformationController'
      }).
      when('/clients', {
        templateUrl: 'partials/clients.html',
        controller: 'clientsController'
      }).
      when('/suppliers', {
        templateUrl: 'partials/suppliers.html',
        controller: 'suppliersController'
      }).
      when('/cities', {
        templateUrl: 'partials/cities.html',
        controller: 'citiesController'
      }).
      when('/units', {
        templateUrl: 'partials/units.html',
        controller: 'unitsController'
      }).
      when('/users', {
        templateUrl: 'partials/users.html',
        controller: 'usersController'
      }).
      when('/orders', {
        templateUrl: 'partials/orders.html',
        controller: 'ordersController'
      }).
      when('/invoices', {
        templateUrl: 'partials/invoices.html',
        controller: 'invoicesController'
      }).
      when('/valuations', {
        templateUrl: 'partials/valuations.html',
        controller: 'valuationsController'
      }).
      when('/claims', {
        templateUrl: 'partials/claims.html',
        controller: 'claimsController'
      }).
      when('/payments', {
        templateUrl: 'partials/payments.html',
        controller: 'paymentsController'
      });
    $httpProvider.interceptors.push(function($window){
        return {
            request: function (config) {
                var token = $window.localStorage.auth_token;
                if (token){
                    // I would have preferred SessionService.get_token, but
                    // that causes a circular dependency. Much simpler this way.
                    config.headers['Authorization'] = 'Bearer ' + token;
                }
                return config;
            }
        }
    });
}]);

// a filter that replaces '^' characters with html <sup> superscript
myApp.filter('superscriptFilter', function(){
    return function (text) {
        if (text.indexOf('^') > -1){
            return text.replace('^', '<sup>') + '</sup>';
        }
        else{
            return text;
        }
    }
});

myApp.run(['$rootScope', '$location', 'SessionService', function($rootScope, $location, SessionService){
    $rootScope.$on("$routeChangeStart", function(event, next, current){
        if (!(SessionService.authenticated("if") || next.public)){
            $location.path("/login");
        }
    });
}]);
