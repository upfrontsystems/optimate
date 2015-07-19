"use strict";
var myApp = angular.module('myApp', [
                    'allControllers',
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
                    'ngSanitize'
                    ]);

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
      });
    $httpProvider.interceptors.push(function($window){
        return {
            request: function (config) {
                var token = $window.sessionStorage.token;
                if (token){
                    // I would have preferred SessionService.get_token, but
                    // that causes a circular dependency. Much simpler this way.
                    config.headers['Authorization'] = 'Bearer ' + token;
                }
                return config;
            }
        }
    });
}])

.run(['$rootScope', '$location', 'SessionService', function($rootScope, $location, SessionService){
    $rootScope.$on("$routeChangeStart", function(event, next, current){
        if (!(SessionService.authenticated() || next.public)){
            $location.path("/login");
        }
    });
}]);
