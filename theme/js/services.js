'use strict';

angular.module('services', ['config'])

.service('SessionService', ['$q', '$http', '$window', '$rootScope', 'globalServerURL', function($q, $http, $window, $rootScope, globalServerURL){

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

    this.authenticated = function(){
        return Boolean($window.sessionStorage.token);
    };

    this.get_token = function(){
        return $window.sessionStorage.token;
    };

}]);
