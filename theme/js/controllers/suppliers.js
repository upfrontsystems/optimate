// Controller for the suppliers page
myApp.controller('suppliersController', ['$scope', '$http', 'globalServerURL', 'SessionService',
    function($scope, $http, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.isDisabled = false;

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $http.get(globalServerURL + 'suppliers').success(function(data) {
            $scope.jsonsuppliers = data;
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

        // Adding or editing a supplier
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'supplier/' + $scope.formData['ID'] + '/',
                        data:$scope.formData
                    }).success(function () {
                        $scope.handleEdited($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'supplier/0/',
                        data:$scope.formData
                    }).success(function (response) {
                        $scope.formData['ID'] = response['newid'];
                        // post the new supplier
                        $scope.handleNew($scope.formData);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new supplier to the list and sort
        $scope.handleNew = function(newsupplier) {
            // the new supplier is added to the list
            $scope.jsonsuppliers.push(newsupplier);
            // sort alphabetically by supplier name
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Supplier added");
        }

        // edit a supplier in the list
        $scope.handleEdited = function(editedsupplier) {
            // search for the supplier and edit in the list
            var result = $.grep($scope.jsonsuppliers, function(e) {
                return e.ID == editedsupplier.ID;
            });
            var i = $scope.jsonsuppliers.indexOf(result[0]);
            $scope.jsonsuppliers[i] = editedsupplier;
            $scope.jsonsuppliers.sort(function(a, b) {
                var textA = a.Name.toUpperCase();
                var textB = b.Name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });
            console.log ("Supplier edited");
        };

        // Set the selected supplier and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedSupplier = obj;
            $('#supplier-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.formData = {'NodeType': 'supplier'};
            if ($scope.selectedSupplier) {
                $('#supplier-'+$scope.selectedSupplier.ID).removeClass('active');
                $scope.selectedSupplier = undefined;
            }
            $scope.saveModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'supplier/' + $scope.selectedSupplier.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'supplier';
            })
            // set each field dirty
            angular.forEach($scope.saveModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete supplier and remove from the supplier list
        $scope.deleteSupplier = function() {
            var deleteid = $scope.selectedSupplier.ID;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'supplier/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonsuppliers, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonsuppliers.indexOf(result[0]);
                $scope.jsonsuppliers.splice(i, 1);
                console.log("Deleted supplier");
            });
        };
    }
]);
