myApp.controller('usersController', ['$scope', '$http', '$modal', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.users = [];
        $scope.isDisabled = false;

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        // populate user list
        ($scope.repopulate = function() {
            $http({
                method: 'GET',
                url: globalServerURL + 'users',
            }).then(
                function(response) {
                    $scope.users = response.data;
                },
                function() {
                    alert('Error while fetching user list');
                }
            );
        })();

        $scope.selectedUser = null;
        $scope.showActionsFor = function(obj) {
            $scope.selectedUser = obj;
            for (var i in $scope.users) {
                $scope.users[i].selected = false;
            }
            obj.selected = true;
        };

        $scope.newuser = {
            username: '',
            password: '',
            permissions: [
                {'Function': 'projects'},
                {'Function': 'orders'},
                {'Function': 'invoices'},
                {'Function': 'valuations'},
                {'Function': 'claims'},
                {'Function': 'payments'},
                {'Function': 'setup'}
            ]
        }
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.newuser.username = '';
            $scope.newuser.password = '';
            $scope.newuser.permissions.forEach(function(v) {
                v.Permission = null;
            });
            if ($scope.selectedUser) {
                $scope.selectedUser.selected = false;
                $scope.selectedUser = null;
            }
        };

        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $scope.newuser.password = '';
            $http({
                method: 'GET',
                url: globalServerURL + 'users/' + $scope.selectedUser.username
            }).then(
                function(response) {
                    $scope.newuser = response.data;
                },
                function() {
                    alert('Error while fetching user information');
                }
            );
        };

        $scope.saveUser = function() {
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.selectedUser) {
                    // Update the password (and later also the roles)
                    $http({
                        method: "POST",
                        url: globalServerURL + 'users/' + $scope.selectedUser.username,
                        data: $scope.newuser
                    }).then(
                        function(response) {
                            $scope.selectedUser.username = $scope.newuser.username;
                            $scope.selectedUser.roles = response.data.roles;
                        },
                        function() {
                            alert('Error while saving user details');
                        }
                    );
                } else {
                    $http({
                        method: "POST",
                        url: globalServerURL + 'users',
                        data: $scope.newuser
                    }).then(
                        function() {
                            $scope.repopulate();
                        },
                        function() {
                            alert('Error while saving user details');
                        }
                    );
                }
            }
        };

        $scope.deleteUser = function(user) {
            if ($scope.selectedUser) {
                $scope.selectedUser.selected = false;
                $scope.selectedUser = null;
            }
            $http({
                method: "DELETE",
                url: globalServerURL + 'users/' + user.username
            }).then(
                function() {
                    $scope.repopulate();
                },
                function() {
                    alert('Error deleting user');
                }
            );
        };

        $scope.toggleEdit = function(item){
            (item.Permission == 'edit') ? (item.Permission = 'view') : (item.Permission = 'edit');
        }

        $scope.toggleView = function(item){
            (item.Permission == 'view') ? (item.Permission = null) : (item.Permission = 'view');
        }
}]);
