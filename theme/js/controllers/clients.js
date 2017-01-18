// controller for the Client data from the server
myApp.controller('clientsController', ['$scope', '$http', 'globalServerURL', 'SessionService',
    function($scope, $http, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.isDisabled = false;
        $scope.filters = {};

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $http.get(globalServerURL + 'clients').success(function(data) {
            $scope.jsonclients = data;
        });

        // load the city list
        $scope.cityList = [{"Name": "Loading..."}];
        var req = {
            method: 'GET',
            url: globalServerURL + 'cities'
        }
        $http(req).success(function(data) {
            $scope.cityList = data;
        });

        // Adding or editing a client
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'client/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'client/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        $scope.formData['ID'] = response['newid'];
                        // post the new client
                        $scope.handleNew($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new client to the list and sort
        $scope.handleNew = function(newclient) {
            // the new client is added to the list
            $scope.jsonclients.push(newclient);
            // sort alphabetically by client name
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Client added");
        }

        // listening for the handle edit client broadcast
        $scope.handleEdited = function(editedclient) {
            // search for the client and edit in the list
            var result = $.grep($scope.jsonclients, function(e) {
                return e.ID == editedclient.ID;
            });
            var i = $scope.jsonclients.indexOf(result[0]);
            $scope.jsonclients[i] = editedclient;
            $scope.jsonclients.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Client edited");
        };

        // Set the selected client and change the css
        $scope.showActionsFor = function(obj) {
            if ($scope.selectedClient){
                $scope.selectedClient.active = undefined;
            }
            obj.active = 'active';
            $scope.selectedClient = obj;
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'client'};
            $scope.selectedClient = undefined;
            $scope.saveModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http.get(globalServerURL + 'client/' + $scope.selectedClient.ID + '/')
            .success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'client';
            })
            // set each field dirty
            angular.forEach($scope.saveModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete client and remove from the clients list
        $scope.deleteClient = function() {
            var deleteid = $scope.selectedClient.ID;
            $scope.selectedClient = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'client/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonclients, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonclients.indexOf(result[0]);
                $scope.jsonclients.splice(i, 1);
                console.log("Deleted client");
            });
        };
    }
]);
