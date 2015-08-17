'use strict';

angular.module('services', ['config'])

.service('SessionService', ['$q', '$http', '$window', '$rootScope', 'globalServerURL',
    function($q, $http, $window, $rootScope, globalServerURL){
        var userpermissions = undefined;

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
                    $window.sessionStorage.token = response.data.access_token;
                    $window.sessionStorage.username = username;
                    userpermissions = undefined;
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
            $window.sessionStorage.clear();
            $rootScope.$broadcast('session:changed', null);
        };

        this.username = function(){
            return $window.sessionStorage.username;
        };

        this.authenticated = function(test){
            return Boolean($window.sessionStorage.token);
        };

        this.get_token = function(){
            return $window.sessionStorage.token;
        };

        this.permissions = function(){
            var deferred = $q.defer();
            if (userpermissions){
                deferred.resolve(userpermissions);
            }
            else{
                $http.get(globalServerURL + 'rights/' + this.username() + '/')
                .success(function(response){
                    userpermissions = response;
                    deferred.resolve(userpermissions);
                });
            }

            return deferred.promise
        }
}]);
