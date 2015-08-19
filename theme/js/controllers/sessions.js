myApp.controller('loginController', ['$scope', '$http', '$location', 'globalServerURL', 'SessionService',
    function($scope, $http, $location, globalServerURL, SessionService) {
        $scope.credentials = {
            username: '',
            password: ''
        }

        $scope.login = function(e) {
            e.preventDefault();
            SessionService.login($scope.credentials.username, $scope.credentials.password).then(
                function() {
                    // get the permissions this user has
                    $http.get(globalServerURL + 'rights/' + $scope.credentials.username + '/')
                    .success(function(response){
                       var permissions = response;
                        // go to a path the user can view
                        if (permissions.projects){
                            $location.path('/projects');
                        }
                        else{
                            for (var key in permissions){
                                if (permissions[key]){
                                    if (key == 'setup'){
                                        $location.path('/cities');
                                    }
                                    else{
                                        $location.path('/' + key);
                                    }
                                    break;
                                }
                            }
                        }
                    });
                },
                function() {
                    alert('Login failed');
                });
        }
}]);

myApp.controller('logoutController', ['$location', 'SessionService',
    function($location, SessionService) {
        SessionService.logout();
        $location.path('/login');
}]);

myApp.controller('navController', ['$scope', '$rootScope', '$http', 'SessionService',
    function($scope, $rootScope, $http, SessionService) {
        // get the user permissions
        $scope.user = {'username': SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        // Hide and show the toolbar depending on whether you're logged in.
        $scope.logged_in = SessionService.authenticated();

        $rootScope.$on('session:changed', function(evt, username) {
            $scope.logged_in = SessionService.authenticated();
            // get the user permissions
            if ($scope.logged_in){
                $scope.user = {'username': SessionService.username()};
                SessionService.permissions().then(function(perm){
                    $scope.user.permissions = perm;
                });
            } else {
                $scope.user = {}
            }
        });
}]);
