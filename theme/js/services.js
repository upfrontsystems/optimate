'use strict';

angular.module('services', ['config'])

.service('SessionService', ['$q', '$http', '$window', 'globalServerURL', function($q, $http, $window, globalServerURL){

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
    };

    this.authenticated = function(){
        return Boolean($window.sessionStorage.token);
    };

    this.get_token = function(){
        return $window.sessionStorage.token;
    };

}]);
