// controller for the Valuation data from the server
myApp.controller('valuationsController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService',
    function($scope, $http, globalServerURL, $timeout, SessionService) {

        toggleMenu('valuations');

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.date = date;
        };
        $scope.isDisabled = false;
        $scope.jsonvaluations = [];
        $scope.budgetgroupList = [];
        $scope.modalForm = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.valuationListLength = $scope.maxPageSize + 1;

        // get the length of the list of all the valuations
        $http.get(globalServerURL + 'valuations/length').success(function(data) {
            $scope.valuationListLength = data['length'];
        });

        $http.get(globalServerURL + 'projects/')
        .success(function(data) {
            $scope.projectsList = data;
        });

        $scope.loadValuationSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'valuations',
                params: {'start': start,
                        'end': end}
            };
            $http(req).success(function(response) {
                var length = response.pop();
                $scope.jsonvaluations = response;
                if (length) {
                    $scope.valuationListLength = length;
                }
                console.log("Valuations loaded");
            });
        }
        $scope.loadValuationSection();

        $scope.loadBudgetItems = function() {
            $http({
                method: 'GET',
                url: globalServerURL + 'node/' + $scope.formData['ProjectID'] + '/budgetgroups/'
            }).success(function(response) {
                $scope.budgetgroupList = response;
                console.log("BudgetItems loaded");
            });
        }

        // Adding or editing a valuation
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // set the list of checked budgetgroups
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the valuation in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + $scope.formData['NodeType'] + '/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new valuation to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new valuation to the list and sort
        $scope.handleNew = function(newvaluation) {
            // the new valuation is added to the list
            if ($scope.jsonvaluations.length > 1) {
                var high = $scope.jsonvaluations[0].ID + 2;
                var low = $scope.jsonvaluations[$scope.jsonvaluations.length - 1].ID + 2;
                // only need to add it if it's id falls in the current section
                if (newvaluation.ID > low && newvaluation.ID < high) {
                    $scope.jsonvaluations.push(newvaluation);
                    // sort by valuation id
                    $scope.jsonvaluations.sort(function(a, b) {
                        var idA = a.ID;
                        var idB = b.ID;
                        return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
                    });
                }
            }
            else {
                $scope.jsonvaluations.push(newvaluation);
            }
            console.log ("Valuation added");
        }

        // handle editing a valuation
        $scope.handleEdited = function(editedvaluation) {
            // search for the valuation and edit in the list
            var result = $.grep($scope.jsonvaluations, function(e) {
                return e.ID == editedvaluation.ID;
            });
            var i = $scope.jsonvaluations.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonvaluations[i] = editedvaluation;
            }
            console.log ("Valuation edited");
        };

        // Set the selected valuation and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedValuation = obj;
            $('#valuation-'+obj.ID).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'valuation'};
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.rowSelected = false;
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            $scope.budgetgroupList = [];
            if ($scope.selectedValuation) {
                $('#valuation-'+$scope.selectedValuation.ID).removeClass('active');
                $scope.selectedValuation = undefined;
            }
            $scope.saveValuationModalForm.$setPristine();
            $('#inputProject').on('change', function(e, params) {
                $scope.loadBudgetItems();
            });
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $scope.rowSelected = false;
            $http({
                method: 'GET',
                url: globalServerURL + 'valuation/' + $scope.selectedValuation.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.budgetgroupList = $scope.formData['BudgetGroupList'];
                $scope.date = new Date($scope.formData['Date']);
                $scope.formData['NodeType'] = 'valuation';
            });
            // set each field dirty
            angular.forEach($scope.saveValuationModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a valuation and remove from the valuations list
        $scope.deleteValuation = function() {
            var deleteid = $scope.selectedValuation.ID;
            $scope.selectedValuation = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonvaluations, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonvaluations.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonvaluations.splice(i, 1);
                    console.log("Deleted valuation");
                }
            });
        };

        $scope.toggleRowsSelected = function(rowsselected) {
            $timeout(function() {
                $scope.rowsSelected = rowsselected;
            });
        }

        $scope.expandBudgetGroupsGrid = function() {
            var selectedRows = $scope.getSelectedNodes()
            for (var i in selectedRows) {
                $http({
                    method: 'POST',
                    url:globalServerURL + 'node/' + $scope.formData['ProjectID'] + '/expand_budgetgroup/' + selectedRows[i].ID,
                    data: {'budgetgroupList': $scope.budgetgroupList},
                }).success(function (response) {
                    $scope.budgetgroupList = response
                    if (i == selectedRows.length-1) {
                        // on the last loop reload the slickgrid and node
                        $scope.toggleRowsSelected(false);
                        $scope.handleReloadValuationSlickgrid();
                    }
                });
            }
        };

        $scope.collapseBudgetGroupsGrid = function() {
            var selectedRows = $scope.getSelectedNodes()
            for (var i in selectedRows) {
                $http({
                    method: 'POST',
                    url:globalServerURL + 'node/' + $scope.formData['ProjectID'] + '/collapse_budgetgroup/' + selectedRows[i].ID,
                    data: {'budgetgroupList': $scope.budgetgroupList},
                }).success(function (response) {
                    // on the last loop reload the slickgrid and node
                    $scope.budgetgroupList = response
                    // on the last loop reload the slickgrid and node
                    if (i == selectedRows.length-1) {
                        // on the last loop reload the slickgrid and node
                        $scope.toggleRowsSelected(false);
                        $scope.handleReloadValuationSlickgrid();
                    }
                });
            }
        };

        $scope.getReport = function (report) {
            if ( report == 'valuation' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'valuation_report/' + $scope.selectedValuation.ID + '/'},
                    {responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    var file = new Blob([response], {type: 'application/pdf'});
                    var fileURL = URL.createObjectURL(file);
                    var result = document.getElementsByClassName("pdf_hidden_download");
                    var anchor = angular.element(result);
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    anchor.attr({
                        href: fileURL,
                        target: '_blank',
                        download: filename
                    })[0].click();
                    // clear the anchor so that everytime a new report is linked
                    anchor.attr({
                        href: '',
                        target: '',
                        download: ''
                    });
                }).error(function(data, status, headers, config) {
                    console.log("Valuation pdf download error")
                });
            }
        };

    }
]);
