myApp.controller('usersController', ['$scope', '$http', '$modal', 'globalServerURL',
    function($scope, $http, $modal, globalServerURL) {

        toggleMenu('setup');
        $scope.users = [];
        $scope.isDisabled = false;

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
                {title: 'projects'},
                {title: 'orders'},
                {title: 'invoices'},
                {title: 'valuations'},
                {title: 'claims'},
                {title: 'payments'},
                {title: 'setup'}
            ]
        }
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.newuser.username = '';
            $scope.newuser.password = '';
            $scope.newuser.permissions.forEach(function(v) {
                v.edit = false;
                v.view = false;
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

}]);
