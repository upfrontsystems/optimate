myApp.controller('usersController', ['$scope', '$http', '$modal', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.users = [];
        $scope.isDisabled = false;
        var basicworkflow = [
                {'Function': 'projects workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Approved'},
                                {'Name': 'Completed'}]},
                {'Function': 'orders workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Processed'}]},
                {'Function': 'invoices workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Due'},
                                {'Name': 'Paid'}]},
                {'Function': 'valuations workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Paid'}]},
                {'Function': 'claims workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Claimed'}]}]

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
            ],
            workflowpermissions: basicworkflow
        }
        $scope.addingState = function () {
            var basicworkflow = [
                {'Function': 'projects workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Approved'},
                                {'Name': 'Completed'}]},
                {'Function': 'orders workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Processed'}]},
                {'Function': 'invoices workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Due'},
                                {'Name': 'Paid'}]},
                {'Function': 'valuations workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Paid'}]},
                {'Function': 'claims workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Claimed'}]}]
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.newuser.username = '';
            $scope.newuser.password = '';
            $scope.newuser.permissions.forEach(function(v) {
                v.Permission = null;
            });
            $scope.newuser.workflowpermissions = basicworkflow;
            if ($scope.selectedUser) {
                $scope.selectedUser.selected = false;
                $scope.selectedUser = null;
            }
        };

        $scope.editingState = function () {
            var basicworkflow = [
                {'Function': 'projects workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Approved'},
                                {'Name': 'Completed'}]},
                {'Function': 'orders workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Processed'}]},
                {'Function': 'invoices workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Due'},
                                {'Name': 'Paid'}]},
                {'Function': 'valuations workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Paid'}]},
                {'Function': 'claims workflow',
                    'Permission': [{'Name': 'Draft'},
                                {'Name': 'Claimed'}]}]
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $scope.newuser.password = '';
            $http({
                method: 'GET',
                url: globalServerURL + 'users/' + $scope.selectedUser.username
            }).success(function(response) {
                $scope.newuser = response;
                // set the selected workflow permissions
                var userworkflow = response.workflowpermissions;
                var selectedworkflow = [];
                for (var i in basicworkflow){
                    var selectedpermissions = basicworkflow.slice(i, i+1)[0];
                    for (var b in userworkflow){
                        if (userworkflow[b].Function === basicworkflow[i].Function){
                            for (var p in selectedpermissions.Permission){
                                if (userworkflow[b].Permission.indexOf(selectedpermissions.Permission[p].Name) > -1){
                                    selectedpermissions.Permission[p].selected = true;
                                }
                            }
                            break;
                        }
                    }
                    selectedworkflow.push(selectedpermissions);
                }
                $scope.newuser.workflowpermissions = selectedworkflow;
            });
        };

        $scope.saveUser = function() {
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.selectedUser) {
                    // Update the user
                    $http({
                        method: "POST",
                        url: globalServerURL + 'users/' + $scope.selectedUser.username,
                        data: $scope.newuser
                    }).success(function(response) {
                        $scope.selectedUser.username = $scope.newuser.username;
                        console.log("User edited");
                    });
                } else {
                    // add a user
                    $http({
                        method: "POST",
                        url: globalServerURL + 'users',
                        data: $scope.newuser
                    }).success(function() {
                        $scope.repopulate();
                        console.log("User added");
                    });
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
            (item.Permission == 'view') ? (item.Permission = null) :
                (item.Permission == 'edit') ? (item.Permission = null) : (item.Permission = 'view');
        }
}]);
