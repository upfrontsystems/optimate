'use strict';

angular.module('services', ['config'])

.service('SessionService', ['$q', '$http', '$window', '$rootScope', 'globalServerURL',
    function($q, $http, $window, $rootScope, globalServerURL){

        this.login = function(username, password){
            var p = $q.defer();
            $http({
                method: 'POST',
                url: globalServerURL + 'auth',
                data: {
                    username: username,
                    password: password
                }
            }).then(
                function(response){
                    // Success
                    $window.localStorage.auth_token = response.data.access_token;
                    $window.localStorage.auth_username = username;
                    $rootScope.$broadcast('session:changed', username);
                    p.resolve();
                },
                function(){
                    // Failure
                    p.reject();
                }
            );
            return p.promise;
        };

        this.logout = function(){
            $window.localStorage.removeItem('auth_token');
            $window.localStorage.removeItem('auth_username');
            $rootScope.$broadcast('session:changed', null);
        };

        this.username = function(){
            return $window.localStorage.auth_username;
        };

        this.authenticated = function(){
            return Boolean($window.localStorage.auth_token);
        };

        this.get_token = function(){
            return $window.localStorage.auth_token;
        };

        this.permissions = function(){
            var deferred = $q.defer();
            if (this.username()){
                $http.get(globalServerURL + 'rights/' + this.username() + '/')
                .success(function(response){
                    deferred.resolve(response);
                });
            }
            else{
                deferred.resolve();
            }
            return deferred.promise;
        };

        this.get_currency = function(){
            var deferred = $q.defer();
            $http.get(globalServerURL + 'currency')
            .success(function(response){
                deferred.resolve(response);
            });
            return deferred.promise;
        };

        this.get_tax_rate = function(){
            var deferred = $q.defer();
            $http.get(globalServerURL + 'company_information')
            .success(function(response){
                deferred.resolve(parseFloat(response.DefaultTaxrate))
            });
            return deferred.promise;
        };
}]);
